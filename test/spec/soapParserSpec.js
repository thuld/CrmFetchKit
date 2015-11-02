/*globals describe, chai, it, beforeEach */

var soapParser = require('../../src/util/soapXmlParser');
var BusinessEntity = require('../../src/util/BusinessEntity');

describe("Specification - soapXmlParser", function(){
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
            '</fetch>'].join(''),
        trimLine = function(line){ return line.trim(); };

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
        responseXml = responseXml.map(trimLine).join("");

        // arrange - convert string to XML Object
        responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

        // action
        errorMsg = soapParser.getSoapError(responseXmlObj);

        // assert
        expect(errorMsg).to.equal(faultString);
    });

    describe('method "getFetchResult"', function (){

        var userid = 'bf507d0c-093a-e411-bfe4-2c59e54216bc',
            parser = new DOMParser(),
            responseXml;

        beforeEach(function(){

            var xml = [
            "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">",
            "    <s:Body>",
            "        <ExecuteResponse xmlns=\"http://schemas.microsoft.com/xrm/2011/Contracts/Services\">",
            "            <ExecuteResult xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" i:type=\"a:RetrieveMultipleResponse\">",
            "                <a:ResponseName xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\">RetrieveMultiple</a:ResponseName>",
            "                <a:Results xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\">",
            "                    <a:KeyValuePairOfstringanyType>",
            "                        <b:key xmlns:b=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\">EntityCollection</b:key>",
            "                        <b:value xmlns:b=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\" i:type=\"a:EntityCollection\">",
            "                            <a:Entities>",
            "                                <a:Entity>",
            "                                    <a:Attributes>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>accountid</b:key>",
            "                                            <b:value i:type=\"c:guid\">a8eb7f93-569d-e411-88f8-6c3be5beb2f4</b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>accountcategorycode</b:key>",
            "                                            <b:value i:type=\"a:OptionSetValue\">",
            "                                                <a:Value>1</a:Value>",
            "                                            </b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>createdon</b:key>",
            "                                            <b:value i:type=\"c:dateTime\">2015-01-16T08:06:32Z</b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>createdby</b:key>",
            "                                            <b:value i:type=\"a:EntityReference\">",
            "                                                <a:Id>" +userid+ "</a:Id>",
            "                                                <a:LogicalName>systemuser</a:LogicalName>",
            "                                                <a:Name>Daniel Rene Thul</a:Name>",
            "                                            </b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>donotemail</b:key>",
            "                                            <b:value i:type=\"c:boolean\">false</b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>donotfax</b:key>",
            "                                            <b:value i:type=\"c:boolean\">true</b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                        <a:KeyValuePairOfstringanyType>",
            "                                            <b:key>name</b:key>",
            "                                            <b:value i:type=\"c:string\">fetch-integration-test</b:value>",
            "                                        </a:KeyValuePairOfstringanyType>",
            "                                    </a:Attributes><a:EntityState i:nil=\"true\" />",
            "                                    <a:FormattedValues>",
            "                                        <a:KeyValuePairOfstringstring>",
            "                                            <b:key>accountcategorycode</b:key>",
            "                                            <b:value>Preferred Customer</b:value>",
            "                                        </a:KeyValuePairOfstringstring>",
            "                                        <a:KeyValuePairOfstringstring>",
            "                                            <b:key>createdon</b:key>",
            "                                            <b:value>16.01.2015 09:06</b:value>",
            "                                        </a:KeyValuePairOfstringstring>",
            "                                        <a:KeyValuePairOfstringstring>",
            "                                            <b:key>donotemail</b:key>",
            "                                            <b:value>Allow</b:value>",
            "                                        </a:KeyValuePairOfstringstring>",
            "                                        <a:KeyValuePairOfstringstring>",
            "                                            <b:key>donotfax</b:key>",
            "                                            <b:value>Do Not Allow</b:value>",
            "                                        </a:KeyValuePairOfstringstring>",
            "                                    </a:FormattedValues>",
            "                                    <a:Id>a8eb7f93-569d-e411-88f8-6c3be5beb2f4</a:Id>",
            "                                    <a:LogicalName>account</a:LogicalName><a:RelatedEntities /></a:Entity>",
            "                            </a:Entities>",
            "                            <a:EntityName>account</a:EntityName>",
            "                            <a:MinActiveRowVersion>-1</a:MinActiveRowVersion>",
            "                            <a:MoreRecords>false</a:MoreRecords>",
            "                            <a:PagingCookie>&lt;cookie page=\"1\"&gt;&lt;accountid last=\"{A8EB7F93-569D-E411-88F8-6C3BE5BEB2F4}\" first=\"{A8EB7F93-569D-E411-88F8-6C3BE5BEB2F4}\" /&gt;&lt;/cookie&gt;</a:PagingCookie>",
            "                            <a:TotalRecordCount>-1</a:TotalRecordCount>",
            "                            <a:TotalRecordCountLimitExceeded>false</a:TotalRecordCountLimitExceeded>",
            "                        </b:value>",
            "                    </a:KeyValuePairOfstringanyType>",
            "                </a:Results>",
            "            </ExecuteResult>",
            "        </ExecuteResponse>",
            "    </s:Body>",
            "</s:Envelope>" ];

            // arrange - remove whitespaces
            responseXml = xml.map(trimLine).join("");
        });

        it('should parse the xml and generate a array of "BusinessEntities" (single element)', function(){

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert
                expect(result.entities).to.be.a('array');
        });

        it('should parse the xml and generate "BusinessEntity" record)', function(){

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert
                expect(result.entities[0]).to.be.an.instanceof(BusinessEntity);
        });

        it('should parse the id of the lookup-value record', function() {

            // arrange - convert string to XML Object
            var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

            // action
            var result = soapParser.getFetchResult(responseXmlObj);

            // assert - "createBy" is a lookup to the "SystemUser" entity
            expect(result.entities[0].getValue('createdby')).to.equal(userid);
        });

        it('should parse the entity-technicalname of the lookup-value record', function() {

            // arrange - convert string to XML Object
            var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

            // action
            var result = soapParser.getFetchResult(responseXmlObj);

            // assert - "createBy" is a lookup to the "SystemUser" entity
            expect(result.entities[0].getValue('createdby', 'logicalName')).to.equal('systemuser');
        });

        it('should parse the primary attr. of the referenced record', function() {

            // arrange - convert string to XML Object
            var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

            // action
            var result = soapParser.getFetchResult(responseXmlObj);

            // assert - "createBy" is a lookup to the "SystemUser" entity
            expect(result.entities[0].getValue('createdby', 'name')).to.exist();
        });

        it('should pasre the for an empty optionset-value "NULL" not "NaN"', function() {

            // arrange - convert string to XML Object
            var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

            // action
            var result = soapParser.getFetchResult(responseXmlObj);

            // assert - the category-code is of type "number"
            expect(result.entities[0].getValue('industrycode')).to.equal(null);
        });

        describe('data-type parsing', function(){

            it('should parse the "createdon" as date', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert - "createOn" of type "Date"
                expect(result.entities[0].getValue('createdon')).to.a('Date');
            });

            it('should parse the boolen attributes as boolean', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                var account = result.entities[0];

                // assert - "donotmail"
                expect(account.getValue('donotemail')).to.be.a('boolean');
                expect(account.getValue('donotemail')).to.be.equal(false);

                // assert - "donotfax"
                expect(account.getValue('donotfax')).to.be.a('boolean');
                expect(account.getValue('donotfax')).to.be.equal(true);
            });

            it('should parse the "category-code" (optionset) of the account', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert - the category-code is populated
                expect(result.entities[0].getValue('accountcategorycode')).to.be.equal(1);
            });

            it('should parse the optionset-value as "number"', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert the category-code is of type "number"
                expect(result.entities[0].getValue('accountcategorycode')).to.be.a('number');
            });
        });

        describe('relevant information for the "FetchMore" method', function(){

            it('should parse the "moreRecords" information', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert - moreRecords is true
                expect(result).to.have.property('moreRecords');
                expect(result.moreRecords).to.be.a('boolean');
                expect(result.moreRecords).to.be.equal(false);

            });

            it('should parse the "entityName" information', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert - moreRecords is true
                expect(result).to.have.property('entityName');
                expect(result.entityName).to.be.a('string');
                expect(result.entityName).to.be.equal('account');
            });

            it('should parse the "totalRecordcount" information', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert
                expect(result.totalRecordCount).to.exist();

            });

            it('should parse the "totalRecordcount" information as number', function() {

                // arrange - convert string to XML Object
                var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

                // action
                var result = soapParser.getFetchResult(responseXmlObj);

                // assert
                expect(result.totalRecordCount).to.be.a('number');
            });
        });
    });

    describe('method - "getRetrieveResult"', function(){

      var parser = new DOMParser(),
          fakeAccountName = 'foobar-unit-testing',
          responseXml;

      beforeEach(function(){
        var xml = [ "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">",
                  "    <s:Body>",
                  "        <ExecuteResponse xmlns=\"http://schemas.microsoft.com/xrm/2011/Contracts/Services\">",
                  "            <ExecuteResult xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" i:type=\"a:RetrieveResponse\">",
                  "                <a:ResponseName xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\">Retrieve</a:ResponseName>",
                  "                <a:Results xmlns:a=\"http://schemas.microsoft.com/xrm/2011/Contracts\">",
                  "                    <a:KeyValuePairOfstringanyType>",
                  "                        <b:key xmlns:b=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\">Entity</b:key>",
                  "                        <b:value xmlns:b=\"http://schemas.datacontract.org/2004/07/System.Collections.Generic\" i:type=\"a:Entity\">",
                  "                            <a:Attributes>",
                  "                                <a:KeyValuePairOfstringanyType>",
                  "                                    <b:key>accountid</b:key>",
                  "                                    <b:value i:type=\"c:guid\">fe9ce180-3881-e511-8100-3863bb35fde0</b:value>",
                  "                                </a:KeyValuePairOfstringanyType>",
                  "                                <a:KeyValuePairOfstringanyType>",
                  "                                    <b:key>donotemail</b:key>",
                  "                                    <b:value i:type=\"c:boolean\">false</b:value>",
                  "                                </a:KeyValuePairOfstringanyType>",
                  "                                <a:KeyValuePairOfstringanyType>",
                  "                                    <b:key>donotfax</b:key>",
                  "                                    <b:value i:type=\"c:boolean\">true</b:value>",
                  "                                </a:KeyValuePairOfstringanyType>",
                  "                                <a:KeyValuePairOfstringanyType>",
                  "                                    <b:key>name</b:key>",
                  "                                    <b:value i:type=\"c:string\">"+fakeAccountName+"</b:value>",
                  "                                </a:KeyValuePairOfstringanyType>",
                  "                                <a:KeyValuePairOfstringanyType>",
                  "                                    <b:key>createdon</b:key>",
                  "                                    <b:value i:type=\"c:dateTime\">2015-11-02T08:05:43Z</b:value>",
                  "                                </a:KeyValuePairOfstringanyType>",
                  "                            </a:Attributes><a:EntityState i:nil=\"true\" />",
                  "                            <a:FormattedValues>",
                  "                                <a:KeyValuePairOfstringstring>",
                  "                                    <b:key>donotemail</b:key>",
                  "                                    <b:value>Allow</b:value>",
                  "                                </a:KeyValuePairOfstringstring>",
                  "                                <a:KeyValuePairOfstringstring>",
                  "                                    <b:key>donotfax</b:key>",
                  "                                    <b:value>Do Not Allow</b:value>",
                  "                                </a:KeyValuePairOfstringstring>",
                  "                                <a:KeyValuePairOfstringstring>",
                  "                                    <b:key>createdon</b:key>",
                  "                                    <b:value>02.11.2015 09:05</b:value>",
                  "                                </a:KeyValuePairOfstringstring>",
                  "                            </a:FormattedValues>",
                  "                            <a:Id>fe9ce180-3881-e511-8100-3863bb35fde0</a:Id><a:KeyAttributes />",
                  "                            <a:LogicalName>account</a:LogicalName><a:RelatedEntities /><a:RowVersion i:nil=\"true\" /></b:value>",
                  "                    </a:KeyValuePairOfstringanyType>",
                  "                </a:Results>",
                  "            </ExecuteResult>",
                  "        </ExecuteResponse>",
                  "    </s:Body>",
                  "</s:Envelope>"];

          // arrange - remove whitespaces
          responseXml = xml.map(trimLine).join("");
      });

      it('should parse the retrieve response and generate a "BusinessEntity" record', function(){

        // arrange - convert string to XML Object
        var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

        // action
        var result = soapParser.getRetrieveResult(responseXmlObj);

        // assert
        expect(result).to.be.an.instanceof(BusinessEntity);

      });

      it('should parse the "name" attribute', function(){

        // arrange - convert string to XML Object
        var responseXmlObj = parser.parseFromString(responseXml, 'text/xml');

        // action
        var result = soapParser.getRetrieveResult(responseXmlObj);

        // assert
        expect(result.getValue('name')).to.equal(fakeAccountName);

      });

    });
});
