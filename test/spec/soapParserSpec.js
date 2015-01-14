/*globals describe, chai, it*/

var soapParser = require('../../src/util/soapXmlParser');

describe("The module 'soapParser'", function(){
    'use strict';

    var expect = chai.expect,
        parsedFetchXml = null,
        fakePageNr = 2,
        fakeCookie ='foobar-paging-cookie',
        fetchxml = [
            '<fetch version="1.0">',
            '  <entity name="account">',
            '    <attribute name="name" />',
            '    <attribute name="accountid" />',
            '    <attribute name="accountcategorycode" />',
            '    <filter type="and">',
            '      <condition attribute="name"',
            '          operator="eq" value="John Doe Inc." />',
            '    </filter>',
            '  </entity>',
            '</fetch>'].join('');

    it("should inject the paging-cookie", function(){

        // action
        parsedFetchXml = soapParser.setPagingDetails(fetchxml,
            fakePageNr, fakeCookie);

        // assert
        var parser = new DOMParser();
        var doc = parser.parseFromString(parsedFetchXml, 'text/xml');
        var fetchElem = doc.getElementsByTagName('fetch')[0];

        expect(fetchElem.getAttribute('paging-cookie')).to.equal(fakeCookie);
    });

    it("should inject the paging number", function(){
        // action
        parsedFetchXml = soapParser.setPagingDetails(fetchxml, fakePageNr, fakeCookie);

        // assert
        var parser = new DOMParser();
        var doc = parser.parseFromString(parsedFetchXml, 'text/xml');
        var fetchElem = doc.getElementsByTagName('fetch')[0];
        var injectedPageNr = parseInt(fetchElem.getAttribute('page'), 10);

        expect(injectedPageNr).to.equal(fakePageNr);
    });
});
