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