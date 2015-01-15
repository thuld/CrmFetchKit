/*globals Xrm, GetGlobalContext */
module.exports = (function(){
    'use strict';

    // cache for the context
    var SOAP_ENDPOINT = '/XRMServices/2011/Organization.svc/web',
        endpointUrlCache;

    // the context object is provided by Dynamics CRM and contais
    // information for the web services calls
    function getContext() {

        var context;

        if (typeof GetGlobalContext !== "undefined") {
            /* jshint ignore:start */
            context = GetGlobalContext();
            /* jshint ignore:end */
        }
        else if (typeof Xrm !== "undefined") {
            context = Xrm.Page.context;
        }
        else {
            throw new Error("Context is not available.");
        }

        return context;
    }

    // server URL based on the context information
    function getServerUrl() {

        var winLocation = window.location,
            url = null,
            localServerUrl = winLocation + "//" + winLocation,
            context = getContext();

        if (context.getClientUrl !== undefined ) {
            // since version SDK 5.0.13
            url = context.getClientUrl();
        }
        else if ( context.isOutlookClient() && !context.isOutlookOnline() ) {
            url = localServerUrl;
        }
        else {
            url = context.getServerUrl();
            url = url.replace(/^(http|https):\/\/([_a-zA-Z0-9\-\.]+)(:([0-9]{1,5}))?/, localServerUrl );
            url = url.replace(/\/$/, "" );
        }

        return url;
    }

    // used the cached version if available
    function getSoapEndpointUrl() {

        if(!endpointUrlCache) {
            endpointUrlCache = getServerUrl() + SOAP_ENDPOINT;
        }

        return endpointUrlCache;
    }

    return {
        getSoapEndpointUrl: getSoapEndpointUrl
    };
}());
