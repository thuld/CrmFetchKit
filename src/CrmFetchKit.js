// CrmFetchKit.js 2.2.1
// http://crmfetchkit.codeplex.com/
// Daniel René Thul <thuld@outlook.com>

/*global Xrm, $, GetGlobalContext */
;(function (window, document, undefined) {
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
    /// Type: JavaScript Implementation of the Entity Class
    ///
    function BusinessEntity() {

        this.Id = null;
        this.logicalName = null;
        this.attributes = { };
    }

    ///
    /// Returns a meaninful value
    ///
    /// Sample: entity.getValue('accountid') or contact.getValue('parentaccountid', 'name')
    ///
    BusinessEntity.prototype.getValue = function (attrname, opt_property) {

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

        if (SERVER_URL === null) {

            var url = null,
                localServerUrl = window.location.protocol + "//" + window.location.host,
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
    /// Parses a date-string in ISO-format into a date-object
    ///
    function parseISO8601Date(s) {

        // parenthese matches:
        // year month day    hours minutes seconds
        // dotmilliseconds
        // tzstring plusminus hours minutes
        var re = /(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.\d+)?(Z|([+-])(\d\d):(\d\d))/;

        var d = [];
        d = s.match(re);

        if (!d) {
            throw "Couldn't parse ISO 8601 date string '" + s + "'";
        }

        // parse strings, leading zeros into proper ints
        var a = [1, 2, 3, 4, 5, 6, 10, 11];

        for (var i = 0, max = a.length; i < max; i++) {
            d[a[i]] = parseInt(d[a[i]], 10);
        }
        d[7] = parseFloat(d[7]);

        // Date.UTC(year, month[, date[, hrs[, min[, sec[, ms]]]]])
        // note that month is 0-11, not 1-12
        // see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/UTC
        var ms = Date.UTC(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);

        // if there are milliseconds, add them
        if (d[7] > 0) {
            ms += Math.round(d[7] * 1000);
        }

        // if there's a timezone, calculate it
        if (d[8] !== 'Z' && d[10]) {

            var offset = d[10] * 60 * 60 * 1000;

            if (d[11]) {
                offset += d[11] * 60 * 1000;
            }
            if (d[9] === '-') {
                ms -= offset;
            }
            else {
                ms += offset;
            }
        }

        return new Date(ms);
    }

    ///
    /// Extracts the entity-name, totalrecord count, etc. form the entity-collection xml-node
    ///
    function getEntityCollectionDetails(entityCollectionNode) {

        var entityName, moreRecords, pagingCookie, totalRecordCount, entitiesNode, collectionChildNode;

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
                    totalRecordCount = parseInt(getNodeText(collectionChildNode));
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

    ///
    /// Get a list of entities from an attr of type 'EntityCollection' e.g. 'Party Lists'
    ///
    function getEntityCollection(entityCollectionNode) {

        var entitiesNode = getChildNode(entityCollectionNode, 'a:Entities').childNodes,
            collectionDetails = getEntityCollectionDetails(entityCollectionNode),
            entities = $.map(entitiesNode, parseSingleEntityNode);

        return {
            entityName: collectionDetails.entityName,
            moreRecords: collectionDetails.moreRecords,
            pagingCookie: collectionDetails.pagingCookie,
            totalRecordCount: collectionDetails.totalRecordCount,
            entities: entities
        };
    }

    ///
    /// Converst the xml definiton into an attribute object.
    /// The joined attributes are evaluated via a recursive call of this function
    ///
    function convertXmlToAttributeObject(type, xmlnode) {

        var attr = { 'type': type };

        switch (type) {

            case "a:OptionSetValue":
                attr.value = parseInt(getNodeText( xmlnode ), 10);
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

                var aliasValue = getChildNode(xmlnode,'a:Value'),
                    aliasType = getAttribute(aliasValue, 'i:type');

                // recursive call
                attr = convertXmlToAttributeObject(aliasType, aliasValue);
                break;

            case 'c:int':
                attr.value = parseInt(getNodeText(xmlnode), 10);
                break;

            case 'c:decimal':
                attr.value = parseFloat(getNodeText(xmlnode));
                break;

            case 'c:dateTime':
                attr.value = parseISO8601Date(getNodeText(xmlnode));
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

    ///
    /// Parses "Attribute" nodes of the SOAP-response
    ///
    function parseAttibutes( attributesNode ) {

        var typedAttrSet = {},
            attrNode = null,
            key = null,
            type = null,
            value = null;

        for (var i = 0, max = attributesNode.childNodes.length; i < max; i++) {

            attrNode = attributesNode.childNodes[i];

            // Establish the key for the attribute
            key = getChildNodeText(attrNode, 'b:key');
            value = getChildNode(attrNode, 'b:value');
            type = getAttribute( value, 'i:type' );

            // populate the object
            typedAttrSet[key] = convertXmlToAttributeObject(type, value);
        }

        return typedAttrSet;
    }

    ///
    /// Parses a single xml-node -> transforms into BusinessEntity
    ///
    function parseSingleEntityNode(entityNode) {

        var entity = new BusinessEntity(),
            childSet = null,
            item = null,
            key = null,
            value = null;

        entity.Id = getChildNodeText(entityNode, 'a:Id');
        entity.attributes = parseAttibutes( getChildNode(entityNode, 'a:Attributes') );
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

    ///
    /// Encoding for the xml values
    /// https://github.com/miketheprogrammer/xml-escape/blob/master/index.js
    ///
    function xmlEncode(string) {

        var maping = {
            '>': '&gt;',
            '<': '&lt;',
            "'": '&apos;',
            '"': '&quot;',
            '&': '&amp;',
        };

        return string.replace(/([&"<>'])/g, function(str, item) {
            return maping[item];
        });
    }

    ///
    /// Converts a given XMLDocument of XmlELement into a string
    ///
    function xmlToString(elem) {

        var serialized;

        if (window.XMLSerializer) {

            // XMLSerializer exists in current Mozilla browsers
            var serializer = new XMLSerializer();
            serialized = serializer.serializeToString(elem);
        }
        else {
            // Internet Explorer has a different approach to serializing XML
            serialized = elem.xml;
        }

        return serialized;
    }

    ///
    /// retrievs the text-value of the expression
    ///
    function getChildNodeText(xml, xpathExpression){

        return getNodeText( getChildNode( xml, xpathExpression ) );
    }

    ///
    ///  Get a single child node that matches the specified name.
    ///
    function getChildNode( xmlNode, nodeName ) {

        var childNode;

        for ( var i = 0, max = xmlNode.childNodes.length; i < max; i++ ) {

            childNode = xmlNode.childNodes[i];

            if ( childNode.nodeName === nodeName ) {
                return childNode;
            }
        }
    }

    ///
    /// Get the attribute regardless of the namespace
    ///
    function getAttribute( xmlNode, attrName ) {

        var attr = null;

        for ( var i = 0; i < xmlNode.attributes.length; i++ ) {

            attr = xmlNode.attributes[i];

            if ( attr.name === attrName ) {
                return attr.value;
            }
        }
    }

    ///
    /// IE 9/10 and Chrome, Firefox, ... using "textContent" and IE 8 using "text
    ///
    function getNodeText( node ) {

        return node.text !== undefined ? node.text : node.textContent;
    }

    ///
    /// Converts the response to a result-object that contains the entities, pagaingcookie...
    ///
    function getFetchResult(data) {

        // "s:Envelope/s:Body/ExecuteResponse/ExecuteResult"
        var executeResult = data.firstChild.firstChild.firstChild.firstChild,
            resultsNode = getChildNode( executeResult, 'a:Results' ),
            entityCollection = getChildNode( resultsNode.firstChild, 'b:value' ),
            resultSet = getChildNode( entityCollection, 'a:Entities' ).childNodes;

        return {
            entityName: getChildNodeText( entityCollection, 'a:EntityName' ),
            moreRecords: ( getChildNodeText( entityCollection, 'a:MoreRecords' ) === 'true' ),
            pagingCookie: getChildNodeText( entityCollection, 'a:PagingCookie' ),
            totalRecordCount: parseInt( getChildNodeText( entityCollection, 'a:TotalRecordCount' ), 10 ),
            entities: $.map( resultSet, parseSingleEntityNode )
        };
    }

    ///
    /// Injects the paging-cookie & page-count
    ///
    function injectPagingDetails(fetchxml, page, pagingCookie) {

        // inject the paging attributes
        var xmldoc = $.parseXML(fetchxml),
            fetch = $(xmldoc).find('fetch');

        fetch.attr('page', page);
        fetch.attr('paging-cookie', pagingCookie);

        return xmlToString(xmldoc);
    }

    ///
    /// Performs the Ajax request
    ///
    function executeRequest(xml, opt_async) {

        // default is true
        var async = (opt_async === false)? false: true;

        return $.ajax({
            type: 'POST',
            async: async,
            data: xml,
            url: getServerUrl() + SOAP_ENDPOINT,
            headers: {
                "Accept": "application/xml, text/xml, */*",
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute"
            }
        });
    }

    ///
    /// Assigns the reocrd to an user or team
    ///
    function assign(id, entityname, assigneeId, assigneeEntityName, opt_async) {

        // default is true
        var async = (opt_async === false)? false: true,
            request = [
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
                '              <a:LogicalName>'+ assigneeEntityName+ '</a:LogicalName>',
                '              <a:Name i:nil=\"true\" />',
                '            </c:value>',
                '          </a:KeyValuePairOfstringanyType>',
                '        </a:Parameters>',
                '        <a:RequestId i:nil=\"true\" />',
                '        <a:RequestName>Assign</a:RequestName>',
                '      </request>',
                '    </Execute>',
                '  </s:Body>',
                '</s:Envelope>'].join('');

        return executeRequest(request, async);
    }

    ///
    /// Executes a fetchxml-request and enables paging
    ///
    function fetchMore(fetchxml, opt_async) {

        // default is true
        var async = (opt_async === false)? false: true,
            request = ['<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">',
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
                        '</s:Body></s:Envelope>'].join('');

        return executeRequest(request, async).then(function (data, status, xhr) {

            return getFetchResult(data, xhr);
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
                pagingFetchxml = injectPagingDetails(fetchxml, pageNumber, result.pagingCookie);

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
    /// Executes a fetch-request an returns a promies object
    ///
    function fetch(fetchxml, opt_async) {

        // default is true
        var async = (opt_async === false)? false: true;

        return fetchMore(fetchxml, async).then(function (result) {

            return result.entities;
        });
    }

    ///
    /// Public API
    ///
    window.CrmFetchKit = {
        Fetch: fetch,
        FetchMore: fetchMore,
        FetchAll: fetchAll,
        Assign: assign
    };
}(window, document));
