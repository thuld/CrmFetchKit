# Important - Minified version and mobile App for CRM 2015
**Do not use** the minified version (`CrmFetchKit.bundle.min.js`) in combination with the *App for CRM*. The App for CRM seems to have problems with minified code. The minified version prevents the successful configuration of the app (step 4/5 of the configuration wizard failed).

This issue affects all versions (3.x.x). The reason for this issue is unknown, Microsoft Support did not provide any details.

# Introduction
Browser library that allows the execution of fetchxml-queries via JavaScript for Dynamics CRM using SOAP endpoint.

Like the [CrmRestKit.js](http://crmrestkit.codeplex.com/) depends this framework on the [promise](http://blogs.telerik.com/kendoui/posts/13-03-28/what-is-the-point-of-promises) concept, but it uses [bluebird](https://github.com/petkaantonov/bluebird) instead of jQuery to manage the complexity of asynchronous operation.

The code and the idea for this framework bases on the [CrmServiceToolkit](http://crmtoolkit.codeplex.com) developed by Daniel Cai.

# Topics
- [Support](#support)
- [Documentation](#documentation)
	- [`GetById`](#getbyid)
	- [`GetByIdSync`](#getbyidsync)
	- [`Fetch`](#fetch)
	- [`FetchSync`](#fetchsync)
	- [`FetchMore`](#fetchmore)
	- [`FetchMoreSync`](#fetchmoresync)
	- [`FetchAll`](#fetchall)
	- [`FetchByPage`](#fetchbypage)
	- [`Assign`](#assign)
	- [`AssignSync`](#assignsync)
	- [`Promise`](#promise-member)
- [Installation](#installation)
- [Build](#build)
- [Testing](#testing)
- [Versions](#versions)

# Support
## Version 3.x
The version 3.x supports Chrome, Firefox and IE9+ and was tested with Dynamics CRM 2013 Online and **Dynamics CRM 2015 Online**.
## Version 3.3.2
Since version 3.3.2 uses the method `GetById` and `GetByIdSync` the SOAP **Retrieve** message. This was needed because the old approach to derive the primary attr. base on the entity name is not working for activities (appointment -> `activityid` and not `appointmentid`).

Furthermore will the `GetById` and `GetByIdSync` now throw an error in case no record is found with this id. I the previous version the value `null` was returned. See integration-test `should yield am error in case a record does not exist`.

## Version 2.x
The version 2.x supports Chrome, Firefox and IE8+ and was tested with **Dynamics CRM 2013 Online**.

# Documentation
In case the provided samples in this section are not sufficient, please review the [integration tests](https://github.com/thuld/CrmFetchKit/blob/master/test/spec/integrationSpec.js).

## GetById
Instead of create a fetchxml query for a very simple query, this method should be used to load an records based on the id.

````javascript
var accountid = '06887701-2642-4a53-99ba-c24ce1a5688b',
	columns = ['name', 'donotfax', 'donotemail', 'createdon'];

CrmFetchKit.GetById('account', accountId, columns).then(function(account) {

		console.log(account.getValue('name'));

	});
````
## GetByIdSync
````javascript
var accountid = '06887701-2642-4a53-99ba-c24ce1a5688b',
	columns = ['name', 'donotfax', 'donotemail', 'createdon'],
	account;

account = CrmFetchKit.GetByIdSync('account', accountId,  columns);

console.log(account.getValue('name'));
````
## Fetch
With the `Fetch` method is it possible to execute fetch-xml based query.
The method will resolve the promise with an array of `BusinessEntity` objects. These type supports the method `getValue(<%attributename%>)`.

The following code load all account records with the name `foobar` and prints the names to the console.

```javascript
var fetchxml = [
	'<fetch version="1.0">',
	'  <entity name="account">',
	'    <attribute name="name" />',
	'    <attribute name="accountid" />',
	'    <filter type="and">',
	'      <condition attribute="name"',
	'          operator="eq" value="foobar" />',
	'    </filter>',
	'  </entity>',
	'</fetch>'].join('');

CrmFetchKit.Fetch(fetchxml).then(function(entities){

	for(var i = 0, max = entities.length; i < max; i++) {
		console.log(entities[0].getValue('name'))
	}
});
```

## FetchSync
```javascript
var fetchxml = [
	'<fetch version="1.0">',
	'  <entity name="account">',
	'    <attribute name="name" />',
	'    <attribute name="accountid" />',
	'    <filter type="and">',
	'      <condition attribute="name"',
	'          operator="eq" value="foobar" />',
	'    </filter>',
	'  </entity>',
	'</fetch>'].join('');

var entities = CrmFetchKit.FetchSync(fetchxml);

for(var i = 0, max = entities.length; i < max; i++) {
	console.log(entities[0].getValue('name'))
}
```

## FetchMore
In a situation where the developer needs more control over the loaded data, the `FetchMore` method should be used. The method will resolve the promise with an object that supports the following properties:
- `totalRecordCount` (number)
- `moreRecords` (boolean)
- `pagingCookie` (string)
- `entityName` (string)
- `entities` (array ob `BusinessEntity` objects)

````javascript
var fetchxml = [
	'<fetch version="1.0"',
	'	returntotalrecordcount="true" ',
	'	count="10">',
	'  <entity name="contact">',
	'    <attribute name="lastname" />',
	'    <attribute name="contactid" />',
	'    <filter type="and">',
	'      <condition attribute="lastname" ',
	'           operator="like" value="foobar" />',
	'    </filter>',
	'  </entity>',
	'</fetch>'].join('');

CrmFetchKit.FetchMore(fetchxml).then(function(response){
	console.log(response.totalRecordCount);
	console.log(response.moreRecords);
	console.log(response.entityName);
	console.log(response.pagingCookie);

	for(var i = 0, max = response.entities; i < max; i++){
		console.log(response.entities[i].getValue('lastname'));
	}
	});
````
## FetchMoreSync
````javascript
var fetchxml = [
	'<fetch version="1.0"',
	'	returntotalrecordcount="true" ',
	'	count="10">',
	'  <entity name="contact">',
	'    <attribute name="lastname" />',
	'    <attribute name="contactid" />',
	'    <filter type="and">',
	'      <condition attribute="lastname" ',
	'           operator="like" value="foobar" />',
	'    </filter>',
	'  </entity>',
	'</fetch>'].join('');

var CrmFetchKit.FetchMoreSync(fetchxml);

console.log(response.totalRecordCount);
console.log(response.moreRecords);
console.log(response.entityName);
console.log(response.pagingCookie);

for(var i = 0, max = response.entities; i < max; i++){
	console.log(response.entities[i].getValue('lastname'));
}

````
## FetchAll
To address the 5.000 records query limit of Dynamics CRM (a single request return at a maximum 5.000 records) provides the CrmFetchKit with the `FetchAll` method an option to load all records retunred by an query.

**Note:** This method supports only the asynchronous execution.
````javascript
// query loads all contact records in the system
var fetchxml = [
	'<fetch version="1.0">',
	'  <entity name="contact">',
	'    <attribute name="lastname" />',
	'    <attribute name="contactid" />',
	'  </entity>',
	'</fetch>'].join('');

CrmFetchKit.FetchAll(fetchxml).then(function(entities){

	for(var i = 0, max = entities.length; i < max; i++) {
		console.log(entities[i].getValue('lastname'));
	}
});
````
Internally uses `FetchAll` the `FetchMore` method and the provided `pagingCookie` to load the pages until all records are loaded.

## FetchByPage
This method allows the load of records per page-number.
````javascript
// load records from the first page
CrmFetchKit.FetchByPage(fetchxml, 1).then(function(responsePage1) {

	// load records form the second page
    return CrmFetchKit.FetchByPage(fetchxml, 2, responsePage1.pagingCookie)
        .then(function(responsePage2){

            //...
        });
})
````

## Assign
The `Assign` method allows the modification of the owner of an CRM record.

````javascript
var contactid = '06569fb8-88d0-4588-bdb8-c20c19e29205',
// the team is the new owner of the concact record
teamid = '4797f323-76ac-4cf7-8342-b7c1bafd5154';

CrmFetchKit.Assign(contactid, 'contact', teamid, 'team').then(function(){

	//..
});
````
## AssignSync
````javascript
var contactid = '06569fb8-88d0-4588-bdb8-c20c19e29205',
	// the team is the new owner of the concact record
	teamid = '4797f323-76ac-4cf7-8342-b7c1bafd5154';

CrmFetchKit.AssignSync(contactid, 'contact', teamid, 'team');
````
**Note:** The parameter for this method have change form the 1.x version of the CrmFetchKit. The old version supported only the assignment of `SystemUsers` where the current version supports `Teams` and `SystemUsers`.

## Promise Member
Since version 3.3.0 support exposes the library the object `Promise`. This is only the reference
to the internally used [bluebird](https://github.com/petkaantonov/bluebird) library.

````javascript
CrmFetchKit.Promise
	.all([CrmFetchKit.Fetch(xml1), CrmFetchKit.Fetch(xml2)])
	.then(function () {
  		console.log("all in");
	});
````

### Support for Joins
FetchXml support the joining via the "link-entity" tag. In case the query yields attributes of the linked entity, an alias must be provided to access these attributes with the `getValue()` method of the business-entity object.

The following query uses the alias `bu` to identify the attributes of the joined entity `businessunit`:

````javascript
// the query loads all account records that belong to the root business unit
var fetchxml = [
	'<fetch version="1.0">',
	'  <entity name="account">',
	'    <attribute name="name" />',
	'    <link-entity name="businessunit" from="businessunitid"',
	'           to="owningbusinessunit" link-type="inner" alias="bu">',
	'       <attribute name="name" />',
	'       <filter>',
	'           <condition attribute="parentbusinessunitid" operator="null" />',
	'       </filter>',
	'   </link-entity>',
	'  </entity>',
	'</fetch>'].join( '' );
````
In order to access the attributes of the buinsess-unit record, the notation `<%ailas%>.<%attributename%>` must be used:
````javascript
CrmFetchKit.Fetch(fetchxml).then(function(entities){

var first = entities[0];

console.log('Name of the business-unit: ' + first.getValue('bu.name'));
console.log('Name of the account: '+ first.getValue('name'));
});
````
### Support for asynchronous and synchronous execution
The methods `Fetch`, `FetchMore` and `Assign` support the options parameter `opt_async` (default is set to `true`). Due to the default value, will the library execute the operation in asynchronous mode when the very last parameter is omitted.

````javascript
CrmFetchKit.Fetch(query);
````
To executed the operation in synchronous mode, the last parameter must be set to `false` when invoking the function
````javascript
CrmFetchKit.Fetch(query, false);
````
The method `FetchAll` supports **only** the asynchronous execution.

# Installation
The GitHub folder `build` hosts two file: `CrmFetchKit.bundle.js`, `CrmFetchKit.min.js`, just download one of these files and deploy the script as web-resource to your CRM server.

**Note:** The library uses [bluebird](https://github.com/petkaantonov/bluebird) for the promise features. The build step (gulp) generates the file `CrmFetchKit.bundle.js` and this file already contains bluebird. So it is not necessary to deploy bluebird as additional web-resource to Dynamics CRM.

## Bower.io
### Update 3.4.0
Since version 3.4.0 is bower not longer needed. All dependencies are replaced with npm.
### Before Version 3.4.0
This module could be installed via [bower](http://bower.io/):
````
bower install crmfetchkit
````

## npm package
This module could be installed via [npm](https://www.npmjs.com/package/crmfetchkit), the first version supporting npm is 3.2.0:
````
npm install crmfetchkit
````

## Build
To build the library from source-code the following components are required:
- Node.js
- bower.io

Open the command line, navigate to the root folder and enter the following command:
````
npm install
````
This will install all the needed node.js packages for the task-runner and the build process.

Next we need to install the client dependencies. Enter the following command:
````
bower install
````
# Testing
## Unit Test
A very simple unit-testing is implemented (based on [karma](http://karma-runner.github.io/0.12/index.html). The test only verifies some basis conditions.

Run the following command to execute the unit-tests:
````
gulp test
````
## Integration-tests
Part of build task is the file "SpecRunner.html" generated. This HTML file contains all dependencies (e.g. `mocha.js`, `chai.js`, `CrmFetchKit.bundle.js`...) so the you need only to deploy this single HTML file as web-resource your environment.
# Versions
## Version 3.x
This version replaced [jQuery](http://jquery.com/) dependency with [bluebird](https://github.com/petkaantonov/bluebird). Due to the use of bluebird instead of jQuery, some method are no longer available by the returned promise:
- `always` instead use `finally`
- `fail` instead use `catch`

### Breaking Changes
The optional `async` for `Fetch`, `FetchMore` and `Assign` is no longer supported. All methods are now  async. That means that `CrmFetchKit.Fetch(xml, false)` will **not** perform a synchronous operation. To execute a sync operation use one of the `*Sync` methods (e.g. `FetchSync`, `FetchMoreSync`).

Furthermore supports the library now the methods `GetById` and `GetByIdSync`.

**Note:** Unfortunately depends `CrmRestKit.js` (use for the integration-tests) still jQuery. Therefor is it not possible to remove the jQuery dependency for now.

Internally uses CrmFetchKit now [browserify](http://browserify.org/) for the dependency management.

## Version 2.x
The version 2.x of the library uses [Mocha.js](http://mochajs.org/) as testing framework (instead of [QUnit](http://qunitjs.com/)) and [Gulp.js](http://gulpjs.com/) for the task automation (linting, build, minify, etc.)

### Breaking Changes
- Before this version the `getValue` method returns an `string` for `option-sets` attributes. With the 2.x version, the method return a value of type `number`.
	- See integration test `should retrieve the optionset-value as "number"`
- The `Assign` method accepts now five attributes (`id`, `entityname`, `assigneeId`, `assigneeEntityName`, `opt_async`).

## Versions 1.x
Previous versions (1.x) of this library are available on CodePlex (http://crmfetchkit.codeplex.com/)
