/*globals describe, it, chai, before, after, Xrm, _, specUtil, Promise*/

'use strict';
describe('CrmFetchKit API', function() {

    // setup chai to use the "expect" style
    var expect = chai.expect,
        whoAmId = null;

    before(function() {

        // get id of the current user
        whoAmId = Xrm.Page.context
            .getUserId().toString().replace(/[{}]/g, '').toLowerCase();
    });

    describe('The API of the library', function(){

        it('should provided the public member "Fetch"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('Fetch');
            expect(CrmFetchKit.Fetch).to.be.a('function');
        });

        it('should provided the public member "FetchMore"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('FetchMore');
        });

        it('should provided the public member "FetchMoreSync"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('FetchMoreSync');
        });

        it('should provided the public member "FetchAll"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('FetchAll');
        });

        it('should provided the public member "Assign"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('Assign');
        });

        it('should provided the public member "AssignSync"', function() {
            // assert
            expect(CrmFetchKit).to.have.property('AssignSync');
        });
    });

    describe('Error handling of the library should be conform with the Promise/A+ specification', function(){

        it('should call the "reject" handler', function(done){

            var fakeAttr = 'THIS_ATTR_DOES_NOT_EXIST',
                fetchxml = [
                '<fetch version="1.0">',
                '  <entity name="account">',
                '    <attribute name="name" />',
                '    <attribute name="' +fakeAttr+ '" />',
                '  </entity>',
                '</fetch>'].join('');

            // action - try to yield an attr that is not in the data model
            CrmFetchKit.Fetch(fetchxml).catch(function(err){

                    // assert
                    expect(err).to.have.string(fakeAttr);
                    done();
            });
        });
    });

    describe("The 'GetById' operation", function() {

        var accountName = 'getById-integration-test',
            accountId = null,
            accountRecord = {
                Name: accountName,
                DoNotFax: true,
                DoNotEMail: false,
                AccountCategoryCode: {
                    Value: 1
                }
            },
            columns = ['name', 'donotfax', 'donotemail', 'createdon'];

        ///
        /// setup
        ///
        before(function(done) {
            this.timeout(8000);

            specUtil.createAccount(accountRecord).then(function(data) {
                accountId = data.d.AccountId;
                done();
            });
        });

        ///
        /// teardown
        ///
        after(function(done) {
            this.timeout(5000);

            var filter = "(Name eq '" + accountName + "')";

            specUtil
                .deleteAccountsByFilter(filter)
                .then(done);
        });

        it('should yield an single account record', function(done) {

            // action
            CrmFetchKit.GetById('account', accountId, columns)
                .then(function(account) {
                    // assert
                    expect(account).to.exist();

                })
                .then(done)
                .catch(done);
        });

        it('should yield an single account record when using the sync counterpart', function() {

            // action
            var account = CrmFetchKit.GetByIdSync('account', accountId, columns);

            // assert
            expect(account).to.exist();
        });

        it('should yield "null" in case a record does not exist', function(){

            var fakeId = 'b887b4fd-f777-455f-a306-c763e904447e';

            // action
            var account = CrmFetchKit.GetByIdSync('account', fakeId, columns);

            // assert
            expect(account).to.be.null();
        });
    });

    describe("The 'Fetch' operation", function() {

        var accountName = 'fetch-integration-test',
            accountId = null,
            accountRecord = {
                Name: accountName,
                AccountCategoryCode: {
                    Value: 1
                },
                DoNotFax: true,
                DoNotEMail: false
            },
            fetchxml = [
                '<fetch version="1.0">',
                '  <entity name="account">',
                '    <attribute name="name" />',
                '    <attribute name="accountid" />',
                '    <attribute name="accountcategorycode" />',
                '    <attribute name="createdon" />',
                '    <attribute name="createdby" />',
                '    <attribute name="donotfax" />',
                '    <attribute name="donotemail" />',
                '    <filter type="and">',
                '      <condition attribute="name"',
                '          operator="eq" value="' + accountName + '" />',
                '    </filter>',
                '  </entity>',
                '</fetch>'
            ].join('');

        ///
        /// setup
        ///
        before(function(done) {
            this.timeout(8000);

            // create an account record
            specUtil.createAccount(accountRecord).then(function(data) {
                accountId = data.d.AccountId;
                done();
            });
        });

        ///
        /// teardown
        ///
        after(function(done) {
            this.timeout(3000);

            var filter = "(Name eq '" + accountName + "')";

            specUtil
                .deleteAccountsByFilter(filter)
                .then(done);
        });

        describe('in sync exectuion via "FetchSync"', function() {

            it('should yield a single account record', function() {

                // action - execute the fetchxml query
                var result = CrmFetchKit.FetchSync(fetchxml);

                expect(result.length).to.equal(1);
            });

            it('should yield the id of the loaded record', function() {

                var entities = CrmFetchKit.FetchSync(fetchxml);
                var id = entities[0].getValue('accountid');

                expect(id).to.exist();
                expect(id).to.equal(accountId);
            });

            it('should yield the "name" of the account', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - only one record is found
                expect(entities[0].getValue('name')).to.be.a('string');
                expect(entities[0].getValue('name')).to.be.equal(accountName);
            });

            it('should yield the "logicalName" of the entity', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - the logical-enity-name is account
                expect(entities[0].logicalName).to.be.equal('account');
            });

            it('should yield the "category-code" (optionset) of the account', function() {
                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - the category-code is populated
                expect(entities[0].getValue('accountcategorycode')).to.be.equal(1);
            });

            it('should yield the optionset-value as "number"', function() {
                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert the category-code is of type "number"
                expect(entities[0].getValue('accountcategorycode')).to.be.a('number');
            });

            it('should yield the for an empty optionset-value "NULL" not "NaN"', function() {
                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - the category-code is of type "number"
                expect(entities[0].getValue('industrycode')).to.equal(null);
            });

            it('should yield the "createdon" attribute', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - "createOn" is populated
                expect(entities[0].getValue('createdon')).to.not.equal(null);
            });

            it('should yield the "createdon" as date', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - "createOn" of type "Date"
                expect(entities[0].getValue('createdon')).to.a('Date');
            });

            it('should yield the id of the lookup-value record', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - "createBy" is a lookup to the "SystemUser" entity
                expect(entities[0].getValue('createdby')).to.equal(whoAmId);
            });

            it('should yield the entity-technicalname of the lookup-value record', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - "createBy" is a lookup to the "SystemUser" entity
                expect(entities[0].getValue('createdby', 'logicalName')).to.equal('systemuser');
            });

            it('should yield the primary attr. of the referenced record', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - "createBy" is a lookup to the "SystemUser" entity
                expect(entities[0].getValue('createdby', 'name')).to.exist();
            });

            it('should yield the boolen attributes as boolean', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);
                var account = entities[0];

                // assert - "donotmail"
                expect(account.getValue('donotemail')).to.be.a('boolean');
                expect(account.getValue('donotemail')).to.be.equal(false);

                // assert - "donotfax"
                expect(account.getValue('donotfax')).to.be.a('boolean');
                expect(account.getValue('donotfax')).to.be.equal(true);
            });

            it('should yield a single account records', function() {

                // action - execute the fetchxml query
                var entities = CrmFetchKit.FetchSync(fetchxml);

                // assert - only one record is found
                expect(entities.length).to.equal(1);
            });

            it('should yield the intenral CRM attribute-type', function() {

                var optionSetAttr = 'preferredcontactmethodcode',
                    prefMethodFetchxml = [
                        '<fetch version="1.0">',
                        '  <entity name="account">',
                        '    <attribute name="name" />',
                        '    <attribute name="' + optionSetAttr + '" />',
                        '    <filter type="and">',
                        '      <condition attribute="name"',
                        '       operator="eq" value="' + accountName + '" />',
                        '    </filter>',
                        '  </entity>',
                        '</fetch>'
                    ].join('');

                var results = CrmFetchKit.FetchSync(prefMethodFetchxml);
                var attr = results[0].getValue(optionSetAttr, 'type');

                // assert - internal type should be options-setvalue
                expect(attr).to.be.equal('a:OptionSetValue');
            });
        });

        describe('in async execution', function() {

            it('should yield a single account record', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml)
                    .then(function(results) {
                        // assert - only one record is found
                        expect(results.length).to.equal(1);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the id of the loaded record', function(done) {

                CrmFetchKit.Fetch(fetchxml).then(function(entities) {
                        var id = entities[0].getValue('accountid');

                        expect(id).to.exist();
                        expect(id).to.equal(accountId);
                    })
                    .then(done)
                    .catch(done);
            });

            it('should yield the "name" of the account', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit
                    .Fetch(fetchxml)
                    .then(function(results) {
                        // assert - only one record is found
                        expect(results[0].getValue('name')).to.be.a('string');
                        expect(results[0].getValue('name')).to.be.equal(accountName);

                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the "logicalName" of the entity', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit
                    .Fetch(fetchxml)
                    .then(function(results) {
                        // assert - the logical-enity-name is account
                        expect(results[0].logicalName).to.be.equal('account');

                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the "category-code" (optionset) of the account', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit
                    .Fetch(fetchxml)
                    .then(function(results) {
                        // assert - the category-code is populated
                        expect(results[0].getValue('accountcategorycode')).to.be.equal(1);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the optionset-value as "number"', function(done) {
                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(results) {
                        // assert the category-code is of type "number"
                        expect(results[0].getValue('accountcategorycode')).to.be.a('number');
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the for an empty optionset-value "NULL" not "NaN"', function(done) {
                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(results) {

                        // assert - the category-code is of type "number"
                        expect(results[0].getValue('industrycode')).to.equal(null);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the "createdon" attribute', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(results) {

                        // assert - "createOn" is populated
                        expect(results[0].getValue('createdon')).to.not.equal(null);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the "createdon" as date', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml)
                    .then(function(results) {

                        // assert - "createOn" of type "Date"
                        expect(results[0].getValue('createdon')).to.a('Date');
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the id of the lookup-value record', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(entities) {

                        var account = entities[0];

                        // assert - "createBy" is a lookup to the "SystemUser" entity
                        expect(account.getValue('createdby')).to.equal(whoAmId);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the entity-technicalname of the lookup-value record', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(entities) {

                        var account = entities[0];

                        // assert - "createBy" is a lookup to the "SystemUser" entity
                        expect(account.getValue('createdby', 'logicalName')).to.equal('systemuser');
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the primary attr. of the referenced record', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml).then(function(entities) {

                        var account = entities[0];

                        // assert - "createBy" is a lookup to the "SystemUser" entity
                        expect(account.getValue('createdby', 'name')).to.exist();
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield the boolen attributes as boolean', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml)
                    .then(function(entities) {

                        var account = entities[0];

                        // assert - "donotmail"
                        expect(account.getValue('donotemail')).to.be.a('boolean');
                        expect(account.getValue('donotemail')).to.be.equal(false);

                        // assert - "donotfax"
                        expect(account.getValue('donotfax')).to.be.a('boolean');
                        expect(account.getValue('donotfax')).to.be.equal(true);

                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should yield a single account records', function(done) {

                // action - execute the fetchxml query
                CrmFetchKit
                    .Fetch(fetchxml)
                    .then(function(results) {
                        // assert - only one record is found
                        expect(results.length).to.equal(1);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });

            it('should executed the query in asynchronous mode', function(done) {

                var codeAfterQueryIsReached = false;

                // action - execute the fetchxml query
                CrmFetchKit.Fetch(fetchxml)
                    .then(function() {
                        // assert - only one record is found
                        expect(codeAfterQueryIsReached).to.equal(true);
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);

                codeAfterQueryIsReached = true;
            });

            it('should yield the intenral CRM attribute-type', function(done) {

                var optionSetAttr = 'preferredcontactmethodcode',
                    prefMethodFetchxml = [
                        '<fetch version="1.0" output-format="xml-platform" mapping="logical">',
                        '  <entity name="account">',
                        '    <attribute name="name" />',
                        '    <attribute name="' + optionSetAttr + '" />',
                        '    <filter type="and">',
                        '      <condition attribute="name"',
                        '       operator="eq" value="' + accountName + '" />',
                        '    </filter>',
                        '  </entity>',
                        '</fetch>'
                    ].join('');

                CrmFetchKit.Fetch(prefMethodFetchxml)
                    .then(function(results) {

                        var attr = results[0].getValue(optionSetAttr, 'type');

                        // assert - internal type should be options-setvalue
                        expect(attr).to.be.equal('a:OptionSetValue');
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });
        });

        describe('supports joins /linked-data', function() {

            var fetchxml = [
                '<fetch version="1.0">',
                '  <entity name="account">',
                '    <attribute name="name" />',
                '    <attribute name="accountid" />',
                '    <attribute name="createdon" />',
                '    <attribute name="createdby" />',
                '    <filter type="and">',
                '      <condition attribute="name" operator="eq" value="' + accountName + '" />',
                '    </filter>',
                '    <link-entity name="businessunit" from="businessunitid"',
                '           to="owningbusinessunit" link-type="inner" alias="bu">',
                '       <attribute name="name" />',
                '       <filter>',
                '           <condition attribute="parentbusinessunitid" operator="null" />',
                '       </filter>',
                '   </link-entity>',
                '  </entity>',
                '</fetch>'
            ].join('');

            it('should provided the joined data via the defined "alias"', function(done) {

                // action - executed fetchxml that uses an join
                CrmFetchKit.Fetch(fetchxml)
                    .then(function(results) {

                        // assert - the query uses "bu" as alias
                        expect(results[0].getValue('bu.name')).to.exist();
                    })
                    .catch(specUtil.onFetchError)
                    .finally(done);
            });
        });

        describe('support for attributes for type enity-collection', function() {

            var numberOfAttendees = 2,
                requiredAttendees = [],
                appointmentId = null;

            // setup
            before(function(done) {
                // increase the timeout limit for mocha
                this.timeout(8000);

                // create the needed test-data
                specUtil.createContactAsAttendees(numberOfAttendees)
                    .then(function(listOfAttendees) {
                        // store the generated attendees
                        requiredAttendees = listOfAttendees;

                        return requiredAttendees;
                    })
                    .then(specUtil.createAppointmentWithAttendees)
                    .then(function(appointmentid) {
                        // keep the id of the created appointment
                        appointmentId = appointmentid;
                        done();
                    });
            });

            // teardown
            after(function() {
                this.timeout(40000);

                // delete the test contact records
                _.each(requiredAttendees, function(activityParty) {
                    specUtil.deleteContactById(activityParty.PartyId.Id);
                });

                // delete the test-appointment
                specUtil.deleteAppointmentById(appointmentId);
            });

            it('should fetch the required-attendes (type of EntityCollection /PartyList)', function(done) {

                var fetchxml = [
                    '<fetch version="1.0">',
                    '  <entity name="appointment">',
                    '    <attribute name="subject" />',
                    '    <attribute name="requiredattendees" />',
                    '    <filter type="and">',
                    '      <condition attribute="activityid" operator="eq" value="' + appointmentId + '" />',
                    '    </filter>',
                    '  </entity>',
                    '</fetch>'
                ].join('');

                CrmFetchKit.Fetch(fetchxml)
                    .then(function(results) {

                        var attendees = results[0].getValue('requiredattendees');

                        // assert - the list of attendees is retrieved
                        expect(attendees.entities.length).to.equal(numberOfAttendees);
                        // assert - the EntityCollection attr. is parsed
                        expect(attendees.entities[0].getValue('partyid')).to.exist();
                    })
                    .then(done)
                    .catch(done);
            });
        });
    });

    describe("The 'FetchMore' operation", function() {

        var numberOfContacts = 15,
            lastName = 'foobar-fetchmore',
            countLimit = 10,
            fetchxml = [
                '<fetch version="1.0" output-format="xml-platform" ',
                'mapping="logical" ',
                'returntotalrecordcount="true" ',
                'count="' + countLimit + '">',
                '  <entity name="contact">',
                '    <attribute name="lastname" />',
                '    <attribute name="contactid" />',
                '    <filter type="and">',
                '      <condition attribute="lastname" ',
                '           operator="like" value="' + lastName + '%" />',
                '    </filter>',
                '  </entity>',
                '</fetch>'
            ].join('');

        // setup
        before(function(done) {

            // increase the execution-time-limit for mocha.js
            this.timeout(15000);

            // create some contact records for the tests
            specUtil
                .createSetOfContacts(numberOfContacts, lastName)
                .then(function(/*notRelevantParameter*/){
                    done();
                });
        });

        // teardown
        after(function(done) {

            // increase the execution-time-limit for mocha.js
            this.timeout(15000);

            specUtil
                .deleteContactsByFilter("LastName eq '" + lastName + "'")
                .then(function( /*notRelevantParameter*/ ) {
                    done();
                });
        });

        it('should support the asynchronous execution', function(done) {

            var codeAfterQueryIsReached = false;

            // action - execute the query in async. mode (default)
            CrmFetchKit.FetchMore(fetchxml)
                .then(function() {
                    // assert
                    expect(codeAfterQueryIsReached).to.be.equal(true);
                })
                .then(done)
                .catch(done);

            codeAfterQueryIsReached = true;
        });

        it('should support the synchronous execution', function() {

            // action - execute the query in sync. mode
            var response = CrmFetchKit.FetchMoreSync(fetchxml);

            // assert
            expect(response).to.exist();
        });

        it('should provide the "totalRecordcount" information', function(done) {

            // action - execute the query. Due to the count-limit
            // the query should only yield the first 10 records
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {
                    // assert
                    expect(response.totalRecordCount).to.exist();
                })
                .then(done)
                .catch(done);
        });

        it('should provide the "totalRecordcount" information as number', function(done) {

            // action - execute the query. Due to the count-limit
            // the query should only yield the first 10 records
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {

                // assert
                expect(response.totalRecordCount).to.be.a('number');
            })
            .then(done)
            .catch(done);
        });

        it('should provide the "moreRecords" information', function(done) {

            // action - execute the query
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {

                    // assert - moreRecords is true
                    expect(response).to.have.property('moreRecords');
                    expect(response.moreRecords).to.be.a('boolean');
                    expect(response.moreRecords).to.be.equal(true);
                })
                .then(done)
                .catch(done);
        });

        it('should provide the "entityName" information', function(done) {

            // action - execute the query
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {

                    // assert - moreRecords is true
                    expect(response).to.have.property('entityName');
                    expect(response.entityName).to.be.a('string');
                    expect(response.entityName).to.be.equal('contact');
                })
                .then(done)
                .catch(done);
        });

        it('should provide the loaded records in the "entities" property', function(done) {

            // action - execute the query
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {

                    // assert - moreRecords is true
                    expect(response).to.have.property('entities');
                    expect(response.entities).to.be.a('array');
                    expect(response.entities.length).to.be.equal(countLimit);
                })
                .then(done)
                .catch(done);
        });

        it('should provide the "pagingCookie" information', function(done) {

            // action - execute the query
            CrmFetchKit.FetchMore(fetchxml).then(function(response) {

                    // assert - moreRecords is true
                    expect(response).to.have.property('pagingCookie');
                    expect(response.pagingCookie).to.be.a('string');
                })
                .then(done)
                .catch(done);
        });
    });

    describe('FetchAll', function() {

        var numnberOfContacts = 7,
            lastName = 'foobar - fetchall',
            queryCountLimit = 2,
            fetchxml = [
                '<fetch version="1.0" count="' + queryCountLimit + '">',
                '  <entity name="contact">',
                '    <attribute name="lastname" />',
                '    <attribute name="contactid" />',
                '    <filter type="and">',
                '      <condition attribute="lastname"',
                '       operator="like" value="' + lastName + '" />',
                '    </filter>',
                '  </entity>',
                '</fetch>'
            ].join('');

        // setup
        before(function(done) {

            // increase the execution-time-limit for mocha.js
            this.timeout(9000);

            // create some contact records for the tests
            specUtil
                .createSetOfContacts(numnberOfContacts, lastName)
                .then(function( /*notRelevantParameter*/ ) {
                    done();
                });
        });

        // teardown
        after(function(done) {
            // increase the execution-time-limit for mocha.js
            this.timeout(9000);

            specUtil
                .deleteContactsByFilter("LastName eq '" + lastName + "'")
                .then(function( /*notRelevantParameter*/ ) {
                    done();
                });
        });

        it('should execute the query in async mode', function(done) {
            // arrange
            var codeAfterQueryIsReached = false;
            // action
            CrmFetchKit.Fetch(fetchxml)
                .then(function() {

                    // assert
                    expect(codeAfterQueryIsReached).to.equal(true);
                })
                .then(done)
                .catch(done);

            codeAfterQueryIsReached = true;
        });

        it('should load all contact records', function(done) {
            this.timeout(8000);

            // action - execute the query
            CrmFetchKit.FetchAll(fetchxml)
                .then(function(entities) {
                    // assert
                    expect(entities.length).to.equal(numnberOfContacts);
                })
                .then(done)
                .catch(done);
        });
    });

    describe("The 'Assign' operation", function() {

        // Note: This integration-test depends on an existing user and an team
        var contactid = null,
            contactlastname = 'foobar',
            userlastname = 'kayir',
            userid = null,
            teamname = 'Integration-Test-Team',
            teamid = null;

        // setup
        before(function(done) {
            // increase timeout limit of mocha
            this.timeout(8000);

            var userfilter = "LastName eq '" + userlastname + "'",
                teamfilter = "Name eq '" + teamname + "'";

            // bluebird magic
            Promise.props({
                contactData: specUtil.createContactRecord(contactlastname),
                teamEntities: specUtil.getTeamByFilter(teamfilter),
                userEntities: specUtil.getSystemUserByFilter(userfilter)
            }).then(function(result){
                // defere the tests until the data is loaded /created
                contactid = result.contactData.d.ContactId;
                teamid = result.teamEntities[0].TeamId;
                userid = result.userEntities[0].SystemUserId;
            })
            .then(done)
            .catch(done);
        });

        // teardown
        after(function(done) {
            // increase timeout limit of mocha
            this.timeout(4000);

            specUtil
                .deleteContactsByFilter("LastName eq '" + contactlastname + "'")
                .then(done);
        });

        describe("This integration tests required some existing data", function(){

            it('exists a team with name "Integration-Test-Team"', function(){
                expect(teamid).to.be.not.null();
            });

            it('exists a user with lastname "kayir"', function(){
                expect(userid).to.be.not.null();
            });
        });

        describe("supports the async execution via 'Assign'", function(){

            it('should change the owner of the record to a team', function(done) {

                // action
                CrmFetchKit.Assign(contactid, 'contact', teamid, 'team')
                .then(function() {

                    specUtil.getContactById(contactid, ['Owner']).then(function(contact){

                        // assert
                        expect(contact.Owner.Id).to.equal(teamid);
                    });
                })
                .then(done)
                .catch(done);
            });

            it('should change the owner of the record to a another user', function(done) {

                // action
                CrmFetchKit.Assign(contactid, 'contact', teamid, 'team')
                .then(function() {

                    specUtil.getContactById(contactid, ['Owner']).then(function(contact){

                        // assert
                        expect(contact.Owner.Id).to.equal(userid);
                    });
                })
                .then(done)
                .catch(done);
            });
        });

        describe("supports the sync execution via 'AssignSync'", function(){

            it('should change the owner of the record to a team', function() {

                // action
                CrmFetchKit.AssignSync(contactid, 'contact', teamid, 'team');

                // get the assinged contact record
                specUtil.getContactByIdSync(contactid, ['Owner'])
                    .then(function(contact) {
                        // assert
                        expect(contact.Owner.Id).to.equal(teamid);
                    });
            });

            it('should change the owner of the record to a another user', function() {

                // action
                CrmFetchKit.AssignSync(contactid, 'contact', teamid, 'team');

                // get the contact record
                specUtil.getContactByIdSync(contactid, ['Owner'])
                    .then(function(contact) {
                        // assert
                        expect(contact.Owner.Id).to.equal(userid);
                    });
            });
        });
    });
});
