/*globals describe, chai, it, beforeEach*/

var xrmclient = require('../../src/util/xrmClientUtil');

describe("The module 'xrmClientUtil'", function(){
    'use strict';

    var expect = chai.expect,
        soapEndpoint = '/XRMServices/2011/Organization.svc/web',
        fakeUrl = 'https://foobar.onmicrosoft.com',
        fakeContext = {
            getClientUrl: function(){ return fakeUrl; }
        };

    // setup - before each test ensure the fake object are cleared
    beforeEach(function(){
        window.Xrm = undefined;
        window.GetGlobalContext = null;
    });

    describe("Method 'getSoapEndpointUrl'", function(){

        it('should return the endpoint-url by using the "GetGlobalContext"', function(){

            // arrange - define fake GetGlobalContext method
            window.GetGlobalContext = function(){ return fakeContext; };

            // action
            var url = xrmclient.getSoapEndpointUrl();

            // assert
            expect(url).to.equal(fakeUrl + soapEndpoint);
        });

        it('should yield the endpoint-url using the Xrm.Pge object', function(){

            // arrange - define fake Xrm object
            window.Xrm = { Page: { context: fakeContext } };

            // action
            var url = xrmclient.getSoapEndpointUrl();

            // assert
            expect(url).to.equal(fakeUrl + soapEndpoint);

        });
    });
});
