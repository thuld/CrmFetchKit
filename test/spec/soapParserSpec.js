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

    it('should extract the server-error message', function(){

        // arrange - http-response with error
        var responseXmlObj,
            errorMsg,
            faultString = "'Account' entity doesn't contain attribute with Name = 'THIS_ATTR_DOES_NOT_EXIST'.",
            parser = new DOMParser(),
            responseXml = [
                "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">",
                "    <s:Body>",
                "        <s:Fault>",
                "            <faultcode>s:Client</faultcode>",
                "            <faultstring xml:lang=\"en-US\">"+faultString+"</faultstring>",
                "            <detail>",
                "                <OrganizationServiceFault xmlns=\"http://schemas.microsoft.com/xrm/2011/Contracts\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\">",
                "                    <ErrorCode>-2147217149</ErrorCode>",
                "                    <ErrorDetails xmlns:a=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\" />",
                "                    <Message>"+faultString+"</Message>",
                "                    <Timestamp>2015-01-16T06:51:11.9541094Z</Timestamp>",
                "                    <InnerFault>",
                "                        <ErrorCode>-2147217149</ErrorCode>",
                "                        <ErrorDetails xmlns:a=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\" />",
                "                        <Message>"+faultString+"</Message>",
                "                        <Timestamp>2015-01-16T06:51:11.9541094Z</Timestamp>",
                "                        <InnerFault i:nil=\"true\" />",
                "                        <TraceText i:nil=\"true\" />",
                "                    </InnerFault>",
                "                    <TraceText i:nil=\"true\" />",
                "                </OrganizationServiceFault>",
                "            </detail>",
                "        </s:Fault>",
                "    </s:Body>",
                "</s:Envelope>"];

        // arrange - remove whitespaces
        responseXml = responseXml.map(String.prototype.trim).join("");
        // arrange - convert string to XML Object
        responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

        // action
        errorMsg = soapParser.getSoapError(responseXmlObj);

        // assert
        expect(errorMsg).to.equal(faultString);
    });
});
