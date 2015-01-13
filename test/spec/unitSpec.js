/*globals describe, chai, it*/

'use strict';
describe('CrmFetchKit', function(){

    var expect = chai.expect;

    describe('API', function(){

        it('should provide a "Fetch" method', function(){
            expect(CrmFetchKit.Fetch).to.exist();
        });

        it('should provide a "FetchMore" method', function(){
            expect(CrmFetchKit.FetchMore).to.to.exist();
        });

        it('should provide a "FetchAll" method', function(){
            expect(CrmFetchKit.FetchAll).to.exist();
        });

        it('should provide a "Assign" method', function(){
            expect(CrmFetchKit.Assign).to.exist();
        });
    });
});
