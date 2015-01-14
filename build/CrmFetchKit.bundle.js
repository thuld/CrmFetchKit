(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var soapXml = require('./util/soapXmlMessages');
var soapParser  = require('./util/soapXmlParser');

/*global Xrm, $, GetGlobalContext */
(function (window, document, undefined) {
    'use strict';

    ///
    /// Private member
    ///
    var SOAP_ENDPOINT = '/XRMServices/2011/Organization.svc/web',
        // cache for the context
        GLOBAL_CONTEXT = null,
        // cache for the server-url
        SERVER_URL = null;

    ///
    /// Private function to the context object.
    ///
    function getContext() {

        if (GLOBAL_CONTEXT === null) {

            if (typeof GetGlobalContext !== "undefined") {

                /* jshint ignore:start */
                GLOBAL_CONTEXT = GetGlobalContext();
                /* jshint ignore:end */
            }
            else {

                if (typeof Xrm !== "undefined") {
                    GLOBAL_CONTEXT = Xrm.Page.context;
                }
                else {
                    throw new Error("Context is not available.");
                }
            }
        }

        return GLOBAL_CONTEXT;
    }

    ///
    /// Private function to return the server URL from the context
    ///
    function getServerUrl() {

        var winLocation = window.location;

        if (SERVER_URL === null) {

            var url = null,
                localServerUrl = winLocation + "//" + winLocation,
                context = getContext();

            if ( Xrm.Page.context.getClientUrl !== undefined ) {
                // since version SDK 5.0.13
                // http://www.magnetismsolutions.com/blog/gayan-pereras-blog/2013/01/07/crm-2011-polaris-new-xrm.page-method

                url = Xrm.Page.context.getClientUrl();
            }
            else if ( context.isOutlookClient() && !context.isOutlookOnline() ) {
                url = localServerUrl;
            }
            else {
                url = context.getServerUrl();
                url = url.replace( /^(http|https):\/\/([_a-zA-Z0-9\-\.]+)(:([0-9]{1,5}))?/, localServerUrl );
                url = url.replace( /\/$/, "" );
            }

            SERVER_URL = url;

        }

        return SERVER_URL;
    }

    ///
    /// Performs the Ajax request
    ///
    function executeRequest(xml, opt_async) {

        // default is true
        var async = (opt_async === false)? false: true,
            url = getServerUrl() + SOAP_ENDPOINT,
            req = new XMLHttpRequest(),
            // result could be a promise of the ajax response
            result = null,
            dfd = null;

        req.open("Post", url, async);

        req.setRequestHeader("Accept", "application/xml, text/xml, */*");
        req.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
        req.setRequestHeader("SOAPAction",
            "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");

        if (async) {

            dfd = new $.Deferred();
            result = dfd.promise();

            req.onreadystatechange = function () {
                // completed
                if (req.readyState === 4) {

                    if(req.status === 200) {
                        dfd.resolve(req.responseXML);
                    }
                    else {
                        dfd.reject( soapParser.getSoapError(req.responseXML) );
                    }
                }
            };

            req.send(xml);
        }
        else {

            req.send(xml);

            if(req.status === 200) {
                result = req.responseXML;
            }
            else {

                var msg = 'CRM SERVER ERROR: ' + soapParser.getSoapError(req.responseXML);
                throw new Error(msg);
            }
        }

        return result;
    }

    ///
    /// Assigns the reocrd to an user or team in async-mode
    ///
    function assignSync(id, entityname, assigneeId, assigneeEntityName) {

        var xml = soapXml.getAssignXml(id, entityname, assigneeId, assigneeEntityName);

        return executeRequest(xml, false);
    }

    ///
    /// Assigns the reocrd to an user or team in async-mode
    ///
    function assign(id, entityname, assigneeId, assigneeEntityName) {

        var xml = soapXml.getAssignXml(id, entityname, assigneeId, assigneeEntityName);

        return executeRequest(xml, true);
    }

    ///
    /// Executes a fetchxml-request and enables paging in async-mode
    ///
    function fetchMoreSync(fetchxml) {

        var requestXml = soapXml.getFetchMoreXml(fetchxml),
            response = executeRequest(requestXml, false);

        // todo - include error handling
        return soapParser.getFetchResult( response );
    }

    ///
    /// Executes a fetchxml-request and enables paging in async-mode
    ///
    function fetchMore(fetchxml) {

        var request = soapXml.getFetchMoreXml(fetchxml);

        return executeRequest(request, true)
            .then(function (response) {
                return soapParser.getFetchResult(response);
            });
    }

    ///
    /// Aync-only: Loads all records (recursive with paging cookie)
    ///
    function fetchAll(fetchxml, opt_page) {

        // defered object - promise for the "all" operation.
        var dfd = $.Deferred(),
            allRecords = [],
            pageNumber = opt_page || 1,
            pagingFetchxml = null;

        // execute the fetch an receive the details (paging-cookie..)
        fetchMore(fetchxml, true).then(function (result) {

            // add the elements to the collection
            allRecords = allRecords.concat(result.entities);

            if (result.moreRecords) {

                // increase the page-number
                pageNumber++;

                // add page-number & paging-cookie
                pagingFetchxml = soapParser.setPagingDetails(fetchxml, pageNumber, result.pagingCookie);

                // recursive call
                fetchAll(pagingFetchxml, pageNumber).then(function (collection) {

                    // add the items to the collection
                    allRecords = allRecords.concat(collection);

                    dfd.resolve(allRecords);

                }, dfd.reject);
            }
            else {
                // in case less then 50 records are included in the resul-set
                dfd.resolve(allRecords);
            }
        }, dfd.reject);

        return dfd.promise();
    }

    ///
    /// Executes a fetch-request an returns a promies object in sync-mode
    ///
    function fetchSync(fetchxml) {

        // todo - add error handling
        var result = fetchMoreSync(fetchxml);

        return result.entities;
    }

    ///
    /// Executes a fetch-request an returns a promies object in async-mode
    ///
    function fetch(fetchxml) {

        return fetchMore(fetchxml).then(function (result) {

            return result.entities;
        });
    }

    function getByIdSync(id, entityname, columns) {

        var fetchxml = soapXml.buildGetByIdFetchXml(id, entityname, columns),
            entities = fetchSync(fetchxml);

        if(entities.length > 1){
            throw new Error('Expected 1 record, found "' +entities.length+ '"');
        }

        // should return "null" instead of "undefined"
        return entities[0] || null;
    }

    function getById(id, entityname, columns) {

        var fetchxml = soapXml.buildGetByIdFetchXml(id, entityname, columns);

        return fetch(fetchxml).then(function(entities){

            if(entities.length > 1){
                throw new Error('Expected 1 record, found "' +entities.length+ '"');
            }

            // should return "null" instead of "undefined"
            return entities[0] || null;
        });
    }

    ///
    /// Public API
    ///
    window.CrmFetchKit = {
        GetById: getById,
        GetByIdSync: getByIdSync,
        Fetch: fetch,
        FetchSync: fetchSync,
        FetchMore: fetchMore,
        FetchMoreSync: fetchMoreSync,
        FetchAll: fetchAll,
        Assign: assign,
        AssignSync: assignSync
    };
}(window, document));

},{"./util/soapXmlMessages":4,"./util/soapXmlParser":5}],2:[function(require,module,exports){


var escape = module.exports = function escape(string) {
  return string.replace(/([&"<>'])/g, function(str, item) {
            return escape.map[item];
          })
}

var map = escape.map = {
    '>': '&gt;'
  , '<': '&lt;'
  , "'": '&apos;'
  , '"': '&quot;'
  , '&': '&amp;'
}
},{}],3:[function(require,module,exports){
module.exports = (function() {
	'use strict';

	// Type: JavaScript Implementation of the Entity Class
	function BusinessEntity() {

		this.Id = null;
		this.logicalName = null;
		this.attributes = {};
	}

	// Getter for the attributes
	// E.g.: entity.getValue('accountid') or contact.getValue('parentaccountid', 'name')
	BusinessEntity.prototype.getValue = function(attrname, opt_property) {

		var attr = this.attributes[attrname];

		if (attr) {

			var attrType = attr.type;

			switch (attrType) {

				case 'a:EntityReference':
					return (opt_property !== undefined) ? attr[opt_property] : attr.guid;

				case 'a:OptionSetValue':
					return (opt_property !== undefined) ? attr[opt_property] : attr.value;

				default:
					return attr.value;
			}
		}

		return null;
	};

	return BusinessEntity;
}());

},{}],4:[function(require,module,exports){
'use strict';

var xmlEncode = require('xml-escape');

// transforms an collection of attributes into an attribute element string
function buildFetchAttributeXml(columns) {

    var attributes = [];

    for (var i = 0, max = columns.length; i < max; i++) {

        attributes.push('<attribute name="' + columns[i] + '" />');
    }

    return attributes.join('');
}

// generates the fetchxml query for the "GetById" method
function buildGetByIdFetchXml(id, entityname, columns) {

    var idAttribute = entityname + 'id';

    return [
        '<fetch version="1.0">',
        '  <entity name="' + entityname + '">',
        buildFetchAttributeXml(columns),
        '    <filter type="and">',
        '      <condition attribute="' + idAttribute + '"',
        '          operator="eq" value="' + id + '" />',
        '    </filter>',
        '  </entity>',
        '</fetch>'
    ].join('');
}

// generates the soap-xml message for the fetch-rquest
function getFetchMoreXml(fetchxml) {

    return [
        '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">',
        ' <s:Body>',
        '  <Execute xmlns="http://schemas.microsoft.com/xrm/2011/Contracts/Services">',
        '     <request i:type="b:RetrieveMultipleRequest" xmlns:b="http://schemas.microsoft.com/xrm/2011/Contracts" ',
        '         xmlns:i="http://www.w3.org/2001/XMLSchema-instance">',
        '             <b:Parameters xmlns:c="http://schemas.datacontract.org/2004/07/System.Collections.Generic">',
        '             <b:KeyValuePairOfstringanyType>',
        '                 <c:key>Query</c:key>',
        '                 <c:value i:type="b:FetchExpression">',
        '                     <b:Query>',
        xmlEncode(fetchxml),
        '                     </b:Query>',
        '                 </c:value>',
        '             </b:KeyValuePairOfstringanyType>',
        '         </b:Parameters>',
        '         <b:RequestId i:nil="true"/>',
        '         <b:RequestName>RetrieveMultiple</b:RequestName>',
        '     </request>',
        ' </Execute>',
        '</s:Body></s:Envelope>'
    ].join('');
}

// generates the soap-xml message for the assign-rquest
function getAssignXml(id, entityname, assigneeId, assigneeEntityName) {

    return [
        '<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">',
        '  <s:Body>',
        '    <Execute xmlns=\"http://schemas.microsoft.com/xrm/2011/Contracts/Services\" ',
        '           xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">',
        '      <request i:type=\"b:AssignRequest\" xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\" ',
        '           xmlns:b=\"http://schemas.microsoft.com/crm/2011/Contracts\">',
        '        <a:Parameters xmlns:c=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\">',
        '          <a:KeyValuePairOfstringanyType>',
        '            <c:key>Target</c:key>',
        '            <c:value i:type=\"a:EntityReference\">',
        '              <a:Id>' + id + '</a:Id>',
        '              <a:LogicalName>' + entityname + '</a:LogicalName>',
        '              <a:Name i:nil=\"true\" />',
        '            </c:value>',
        '          </a:KeyValuePairOfstringanyType>',
        '          <a:KeyValuePairOfstringanyType>',
        '            <c:key>Assignee</c:key>',
        '            <c:value i:type=\"a:EntityReference\">',
        '              <a:Id>' + assigneeId + '</a:Id>',
        '              <a:LogicalName>' + assigneeEntityName + '</a:LogicalName>',
        '              <a:Name i:nil=\"true\" />',
        '            </c:value>',
        '          </a:KeyValuePairOfstringanyType>',
        '        </a:Parameters>',
        '        <a:RequestId i:nil=\"true\" />',
        '        <a:RequestName>Assign</a:RequestName>',
        '      </request>',
        '    </Execute>',
        '  </s:Body>',
        '</s:Envelope>'
    ].join('');
}

///
/// Public API of the module
///
module.exports = {
    getFetchMoreXml: getFetchMoreXml,
    buildFetchAttributeXml: buildFetchAttributeXml,
    getAssignXml: getAssignXml,
    buildGetByIdFetchXml: buildGetByIdFetchXml,
};

},{"xml-escape":2}],5:[function(require,module,exports){
var BusinessEntity = require('./BusinessEntity');

module.exports = (function() {
	'use strict';

	/// IE9/10 and Chrome, Firefox, support "textContent" and IE8 using "text"
	function getNodeText(node) {

		return node.text !== undefined ? node.text : node.textContent;
	}

	// get a single child node that matches the specified name.
	function getChildNode(xmlNode, nodeName) {

		var childNode;

		for (var i = 0, max = xmlNode.childNodes.length; i < max; i++) {

			childNode = xmlNode.childNodes[i];

			if (childNode.nodeName === nodeName) {
				return childNode;
			}
		}
	}

	// Get the attribute regardless of the namespace
	function getAttribute(xmlNode, attrName) {

		var attr = null;

		for (var i = 0; i < xmlNode.attributes.length; i++) {

			attr = xmlNode.attributes[i];

			if (attr.name === attrName) {
				return attr.value;
			}
		}
	}

	// retrievs the text-value of the expression
	function getChildNodeText(xml, xpathExpression) {

		return getNodeText(getChildNode(xml, xpathExpression));
	}

	// injects the paging-cookie & page-count
	function setPagingDetails(fetchxml, pageNumber, pagingCookie) {

		var serializer = new XMLSerializer(),
			parser = new DOMParser(),
			fetchDoc = parser.parseFromString(fetchxml, 'text/xml'),
			fetchElem = fetchDoc.getElementsByTagName('fetch')[0];

		fetchElem.setAttribute('page', pageNumber);
		fetchElem.setAttribute('paging-cookie', pagingCookie);

		return serializer.serializeToString(fetchDoc);
	}

	// parses a date-string in ISO-format into a date-object
	function dateObjectFromUTCString(utcString) {

		var s = utcString.split(/\D/);

		return new Date(Date.UTC(+s[0], --s[1], +s[2], +s[3], +s[4], +s[5], 0));
	}

	// extracts the error message generated by the Dynamics CRM server
	function getSoapError(soapXml) {

		var bodyNode, faultNode, faultStringNode;

		try {
			bodyNode = soapXml.firstChild.firstChild;
			faultNode = getChildNode(bodyNode, 's:Fault');
			faultStringNode = getChildNode(faultNode, 'faultstring');

			return getNodeText(faultStringNode);
		} catch (e) {
			return "An error occurred when parsing the error returned from CRM server: " + e.message;
		}
	}

	// extracts the entity-name, totalrecord count, etc.
	// form the entity-collection xml-node
	function getEntityCollectionDetails(entityCollectionNode) {

		var entityName, moreRecords, pagingCookie,
			totalRecordCount, entitiesNode, collectionChildNode;

		// Try to get all child nodes in one pass
		for (var m = 0; m < entityCollectionNode.childNodes.length; m++) {

			collectionChildNode = entityCollectionNode.childNodes[m];

			switch (collectionChildNode.nodeName) {

				case "a:EntityName":
					entityName = getNodeText(collectionChildNode);
					break;
				case "a:MoreRecords":
					moreRecords = getNodeText(collectionChildNode) === "true";
					break;
				case "a:PagingCookie":
					pagingCookie = getNodeText(collectionChildNode);
					break;
				case "a:TotalRecordCount":
					totalRecordCount = parseInt(getNodeText(collectionChildNode), 10);
					break;
				case "a:Entities":
					entitiesNode = collectionChildNode;
					break;
			}
		}

		return {
			entityName: entityName,
			moreRecords: moreRecords,
			pagingCookie: pagingCookie,
			totalRecordCount: totalRecordCount
		};
	}

	// parses "Attribute" nodes of the SOAP-response
	function parseAttibutes(attributesNode) {

		var typedAttrSet = {},
			attrNode, key, type, value;

		for (var i = 0, max = attributesNode.childNodes.length; i < max; i++) {

			attrNode = attributesNode.childNodes[i];

			// Establish the key for the attribute
			key = getChildNodeText(attrNode, 'b:key');
			value = getChildNode(attrNode, 'b:value');
			type = getAttribute(value, 'i:type');

			// populate the object
			typedAttrSet[key] = xmlNodeToAttributeObject(type, value);
		}

		return typedAttrSet;
	}

	// Parses a single xml-node -> transforms into BusinessEntity
	function parseSingleEntityNode(entityNode) {

		var entity = new BusinessEntity(),
			childSet, item, key, value;

		entity.Id = getChildNodeText(entityNode, 'a:Id');
		entity.attributes = parseAttibutes(getChildNode(entityNode, 'a:Attributes'));
		entity.logicalName = getChildNodeText(entityNode, 'a:LogicalName');

		// parse the formated values
		childSet = getChildNode(entityNode, 'a:FormattedValues').childNodes;

		for (var i = 0, max = childSet.length; i < max; i++) {

			item = childSet[i];
			key = getChildNodeText(item, 'b:key');
			value = getChildNodeText(item, 'b:value');

			entity.attributes[key].formattedValue = value;
		}

		return entity;
	}

	// get a list of entities from an attr of type 'EntityCollection'
	// e.g. 'Party Lists'
	function getEntityCollection(entityCollectionNode) {

		var entitiesNode = getChildNode(entityCollectionNode, 'a:Entities').childNodes,
			collectionDetails = getEntityCollectionDetails(entityCollectionNode),
			entities = [];

		for (var i = 0, max = entitiesNode.length; i < max; i++) {
			entities.push(parseSingleEntityNode(entitiesNode[i]));
		}

		return {
			entityName: collectionDetails.entityName,
			moreRecords: collectionDetails.moreRecords,
			pagingCookie: collectionDetails.pagingCookie,
			totalRecordCount: collectionDetails.totalRecordCount,
			entities: entities
		};
	}

	// Converst the xml definiton into an attribute object.
	// The joined attributes are evaluated via a recursive call of this function
	function xmlNodeToAttributeObject(type, xmlnode) {

		var attr = {
			'type': type
		};

		switch (type) {

			case "a:OptionSetValue":
				attr.value = parseInt(getNodeText(xmlnode), 10);
				break;

			case "a:EntityReference":
				attr.guid = getChildNodeText(xmlnode, 'a:Id');
				attr.name = getChildNodeText(xmlnode, 'a:Name');
				attr.logicalName = getChildNodeText(xmlnode, 'a:LogicalName');
				break;

			case "a:EntityCollection":
				attr.value = getEntityCollection(xmlnode);
				break;

			case "a:Money":
				attr.value = parseFloat(getNodeText(xmlnode), 10);
				break;

			case "a:AliasedValue":

				var aliasValue = getChildNode(xmlnode, 'a:Value'),
					aliasType = getAttribute(aliasValue, 'i:type');

				// recursive call
				attr = xmlNodeToAttributeObject(aliasType, aliasValue);
				break;

			case 'c:int':
				attr.value = parseInt(getNodeText(xmlnode), 10);
				break;

			case 'c:decimal':
				attr.value = parseFloat(getNodeText(xmlnode));
				break;

			case 'c:dateTime':
				attr.value = dateObjectFromUTCString(getNodeText(xmlnode));
				break;

			case 'c:boolean':
				attr.value = (getNodeText(xmlnode) !== 'true') ? false : true;
				break;

			default:
				attr.value = getNodeText(xmlnode);
				break;
		}

		return attr;
	}

	// converts the response to a result-object that contains the
	// entities, pagaingcookie...
	function getFetchResult(data) {

		// "s:Envelope/s:Body/ExecuteResponse/ExecuteResult"
		var executeResult = data.firstChild.firstChild.firstChild.firstChild,
			resultsNode = getChildNode(executeResult, 'a:Results'),
			entityCollectionNode = getChildNode(resultsNode.firstChild, 'b:value');

		return getEntityCollection(entityCollectionNode);
	}

	///
	/// Public API
	///
	return {
		setPagingDetails: setPagingDetails,
		getSoapError: getSoapError,
		getFetchResult: getFetchResult
	};
}());

},{"./BusinessEntity":3}]},{},[1]);
