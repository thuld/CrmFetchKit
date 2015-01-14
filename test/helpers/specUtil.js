/*globals $, _, CrmRestKit*/

///
/// Module provides some helper functions. The test-specs should not be cluttered with
/// these kind of functions /methods
///
'use strict';
;(function(){

    ///
    /// error-handler for the CrmRestKit
    ///
    function onRestError(xhr, status, errorThrown) {

        var msg =  JSON.parse(xhr.responseText).error.message;

        console.log( msg );
        console.log('---------------------------');
        console.log( 'status:' + status );
        console.log('errorThrown' + errorThrown.toString());

        throw new Error(msg);
    }

    /*
    ///
    /// error-handler for the CrmFetchKit
    ///
    function onFetchError(xhr, status, errorThrown) {

        var msg = $(xhr.responseXML).find('Message').text();

        console.log(msg);
        console.log('---------------------------');
        console.log( 'status:' + status );
        console.log('errorThrown' + errorThrown.toString());
    }
    */

    ///
    /// transforms on odata record of type contact into an activity-party record
    ///
    function oDataContactToActivityParty(data) {

        return {
            PartyId: { Id: data.d.ContactId, LogicalName: 'contact' },
            // Set the participation type (what role the party has on the activity).
            // 5 --> 'Specifies a required attendee.'
            // (http://msdn.microsoft.com/en-us/library/gg328549.aspx)
            ParticipationTypeMask: { Value: 5 }
        };
    }

    ///
    /// creates a set of contacts based provided number and transforms
    /// the records in to activity-party objectsd
    ///
    function createContactAsAttendees(numberOfAttendees){

        return createSetOfContacts(numberOfAttendees)
            .then(function(setOfContacts){
                // transform array of contacat into array of act-party-items
                return _.map(setOfContacts, oDataContactToActivityParty);
            });
    }

    ///
    /// creates an contact record in async mode and return a promise
    ///
    function createContactRecord(opt_lastname){

        var lastname = opt_lastname || 'foobar';

        return CrmRestKit
            .Create('Contact', {'LastName': lastname })
            .then(function(data){
                // only the data parameter is relevant
                return data;
            });
    }

    ///
    /// Creates a set of contact records, returns promise
    ///
    function createSetOfContacts(numberOfRecords, opt_lastname) {

        var setOfCreatePromises = [];

        for(var i = 0; i < numberOfRecords; i++) {
            setOfCreatePromises.push(createContactRecord(opt_lastname));
        }

        // return a promise that is resolved once all
        // contact-record-promises are completed
        return $.when.apply($, setOfCreatePromises)
            .then(function(){

                // transform the arumgents object into an array
                return Array.prototype.slice.call(arguments);
            })
            .fail(onRestError);
    }

    function createAppointmentWithAttendees(requiredAttendees){

        var appointment = {
            Subject: 'foobar - appointment',
            ScheduledStart: new Date().toISOString(),
            ScheduledEnd: new Date().toISOString()
        };

        // populate the list of attendees at appointment-level
        appointment.appointment_activity_parties = requiredAttendees;

        return CrmRestKit.Create('Appointment', appointment)
                    .then(function (data) {
                        return data.d.ActivityId;
                    });
    }

    ///
    /// returns an promise that is resolved once all delete operation
    /// are completed
    ///
    function deleteContactsByFilter(filter) {

        var setOfDeletePromises = [];

        return CrmRestKit
            .ByQueryAll('Contact', ['ContactId'], filter)
            .then(function(data){

                _.each(data, function(contactrecord){
                    setOfDeletePromises.push(
                        CrmRestKit.Delete('Contact', contactrecord.ContactId)
                    );
                });
            })
            .then(function(){

                // return a promise that is resolved once all
                // deleted-promises are completed
                return $.when.apply($, setOfDeletePromises);
            });
    }

    ///
    /// returns an promise that is resolved once all delete operation
    /// are completed
    ///
    function deleteAccountsByFilter(filter) {

        var setOfDeletePromises = [];

        return CrmRestKit
            .ByQueryAll('Account', ['AccountId'], filter)
            .then(function(data){

                _.each(data, function(contactrecord){
                    setOfDeletePromises.push(
                        CrmRestKit.Delete('Account', contactrecord.AccountId)
                    );
                });
            })
            .then(function(){

                // return a promise that is resolved once all
                // deleted-promises are completed
                return $.when.apply($, setOfDeletePromises);
            });
    }


    function createAccount(accountData){

        // create an account record and return promise
        return CrmRestKit.Create('Account', accountData)
            .fail(onRestError);
    }


    function deleteContactById(contactid){

        return CrmRestKit.Delete('Contact', contactid);
    }

    function deleteAppointmentById(appid){
        // delete the test-appointment
        return CrmRestKit.Delete('Appointment', appid);
    }

    function getTeamByFilter(filter){

        return CrmRestKit
            .ByQuery('Team', ['TeamId'], filter)
            .then(function(data /*notNeededPrameter*/ ) {
                // only the entities records are relevant
                return data.d.results;
            });
    }

    function getSystemUserByFilter(filter) {

        return CrmRestKit
            .ByQuery('SystemUser', ['SystemUserId'], filter)
            .then(function(data /*notNeededPrameter*/ ) {
                // only the entities records are relevant
                return data.d.results;
            });
    }

    function getContactById(id, columns) {

        return CrmRestKit.Retrieve('Contact', id, columns);
    }

    function getContactByIdSync(id, columns) {

        return CrmRestKit.Retrieve('Contact', id, columns, false);
    }

    ///
    /// Public API
    ///
    window.specUtil = {
        getTeamByFilter:getTeamByFilter,
        getSystemUserByFilter:getSystemUserByFilter,
        getContactById: getContactById,
        getContactByIdSync: getContactByIdSync,
        createAppointmentWithAttendees: createAppointmentWithAttendees,
        createContactAsAttendees: createContactAsAttendees,
        createSetOfContacts: createSetOfContacts,
        createContactRecord: createContactRecord,
        createAccount: createAccount,
        deleteContactsByFilter: deleteContactsByFilter,
        deleteContactById: deleteContactById,
        deleteAccountsByFilter: deleteAccountsByFilter,
        deleteAppointmentById: deleteAppointmentById,
        // onFetchError: onFetchError,
        onRestError: onRestError,
    };
}());
