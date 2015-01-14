var soapXml = require('./util/soapXmlMessages');
var soapParser = require('./util/soapXmlParser');
var xrmHttpUtil = require('./util/xrmHttpRequestUtil');

/*global Xrm, GetGlobalContext */
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
            url = getServerUrl() + SOAP_ENDPOINT;

        if(async){
            return xrmHttpUtil.xrmHttpPostRequestAsync(url, xml);
        }
        else {
            return xrmHttpUtil.xrmHttpPostRequestSync(url, xml);
        }
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

        var allRecords = [],
            pageNumber = opt_page || 1;

        return fetchMore(fetchxml).then(function(result){

            var pagingFetchxml;

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
                pagingFetchxml = soapParser.setPagingDetails(fetchxml, pageNumber, result.pagingCookie);

                // recursive call
                return fetchAll(pagingFetchxml, pageNumber);
            }
        });
    }

    ///
    /// Executes a fetch-request an returns a promies object in sync-mode
    ///
    function fetchSync(fetchxml) {

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
