var soapXml = require('./util/soapXmlMessages');
var soapParser = require('./util/soapXmlParser');
var xrmHttpUtil = require('./util/xrmHttpRequestUtil');
var clientUtil = require('./util/xrmClientUtil');

(function (window, document, undefined) {
    'use strict';

    // performs the post-http request against the soap endpoint
    // based on the optional parameter 'opt_async' perform the method a
    // synchronous or asynchronous operation
    function executeRequest(xml, opt_async) {

        // default is 'true'
        var async = (opt_async === false)? false: true,
            url = clientUtil.getSoapEndpointUrl();

        if(async){
            return xrmHttpUtil.xrmHttpPostRequestAsync(url, xml);
        }
        else {
            return xrmHttpUtil.xrmHttpPostRequestSync(url, xml);
        }
    }

    // assigns synchronously a CRM reocrd to an user or team
    function assignSync(targetId, targetEntity, assigneeId, assigneeEntity) {

        var xml = soapXml.getAssignXml(targetId, targetEntity,
            assigneeId, assigneeEntity);

        return executeRequest(xml, false);
    }

    // assigns asynchronously a CRM record (target) to an user or team
    // and returns a promise
    function assign(targetId, targetEntity, assigneeId, assigneeEntity) {

        var xml = soapXml.getAssignXml(targetId, targetEntity,
            assigneeId, assigneeEntity);

        return executeRequest(xml, true);
    }

    // executes synchronously an fetchxml-request and returns, beside
    // of the records some meta data (e.g. total-record-count)
    function fetchMoreSync(fetchxml) {

        var requestXml = soapXml.getFetchMoreXml(fetchxml),
            response = executeRequest(requestXml, false);

        return soapParser.getFetchResult( response );
    }

    // executes asynchronously an fetchxml-request and returns, beside
    // of the records some meta data (e.g. total-record-count) as promise
    function fetchMore(fetchxml) {

        var request = soapXml.getFetchMoreXml(fetchxml);

        return executeRequest(request, true)
            .then(function (response) {
                return soapParser.getFetchResult(response);
            });
    }

    // loads all records (recursive with paging cookie) and returns promise
    function fetchAll(fetchxml, opt_page, opt_allRecords) {

        var allRecords = opt_allRecords || [],
            pageNumber = opt_page || 1;

        return fetchMore(fetchxml).then(function(result){
            var pagingFetchXml;

            // add the elements to the collection
            allRecords = allRecords.concat(result.entities);

            if(!result.moreRecords){
                // all records are loaded
                return allRecords;
            }
            else {
                // more to load - increase the page-number
                pageNumber++;

                // add page-number & paging-cookie
                pagingFetchXml = soapParser.setPagingDetails(
                                    fetchxml, pageNumber, result.pagingCookie);

                // recursive call (returns another promise)
                return fetchAll(pagingFetchXml, pageNumber, allRecords);
            }
        });
    }

    // executes a fetch-request an returns a promies object in sync-mode
    function fetchSync(fetchxml) {

        var result = fetchMoreSync(fetchxml);

        return result.entities;
    }

    // performs a asynchronous fetch-request and returns a promies
    function fetch(fetchxml) {

        return fetchMore(fetchxml).then(function (result) {

            return result.entities;
        });
    }

    function getByIdSync(entityname, id, columns) {

        var fetchxml = soapXml.buildGetByIdFetchXml(id, entityname, columns),
            entities = fetchSync(fetchxml);

        if(entities.length > 1){
            throw new Error('Expected 1 record, found "' +entities.length+ '"');
        }

        // should return "null" instead of "undefined"
        return entities[0] || null;
    }

    function getById(entityname, id, columns) {

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
