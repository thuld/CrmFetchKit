/*globals describe, chai, it, BusinessEntity*/

// do not assign the require to a varialbe!
// the main module poplates the window object but does not return a value
require('../../src/main.js');

describe('Specification - CrmFetchKit', function(){
    'use strict';

    var expect = chai.expect;

    describe('API', function(){

        it('should provide a "Fetch" method', function(){
            expect(CrmFetchKit.Fetch).to.exist();
        });

        it('should provide a "FetchSync" method', function(){
            expect(CrmFetchKit.FetchSync).to.exist();
        });

        it('should provide a "FetchMore" method', function(){
            expect(CrmFetchKit.FetchMore).to.to.exist();
        });

        it('should provide a "FetchMoreSync" method', function(){
            expect(CrmFetchKit.FetchMoreSync).to.to.exist();
        });

        it('should provide a "FetchAll" method', function(){
            expect(CrmFetchKit.FetchAll).to.exist();
        });

        it('should provide a "Assign" method', function(){
            expect(CrmFetchKit.Assign).to.exist();
        });

        it('should provide a "AssignSync" method', function(){
            expect(CrmFetchKit.AssignSync).to.exist();
        });

        it('should provide a "GetById" method', function(){
            expect(CrmFetchKit.GetById).to.exist();
        });
        
         it('should provide a "FetchByPage" method', function(){
            expect(CrmFetchKit.FetchByPage).to.exist();
        });
    });

    describe('By using "brwoserify" the global namespace should not be cluttered', function(){

        it('"Business Entity" should not be part of the global namespace', function(){
            expect(typeof BusinessEntity).to.be.equal('undefined');
        });

        it('should ensure that "soapParser" is not public', function(){

            expect(typeof convertXmlToAttributeObject).to.be.equal('undefined');
        });
    });
});
