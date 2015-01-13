#Introduction
Browser library that allows the execution of fetchxml-queries via JavaScript for Dynamics CRM using SOAP endpoint.

Just like the [CrmRestKit.js](http://crmrestkit.codeplex.com/) this framework uses the [promise](http://blogs.telerik.com/kendoui/posts/13-03-28/what-is-the-point-of-promises) capacities of jQuery to manage the complexity of asynchronous operation.
The code and the idea for this framework bases on the [CrmServiceToolkit](http://crmtoolkit.codeplex.com) developed by Daniel Cai.

#Topics
- [Documentation](#documentation)
	- [`Fetch`](#fetch)
	- [`FetchMore`](#fetchmore)
	- [`FetchAll`](#fetchall)
	- [`Assign`](#assign)
- [Installation](#installation)
- [Testing](#testing)
- [Versions](#versions)

#Documentation
In case the provided samples in this section are not sufficient, please review the [integration tests](https://github.com/thuld/CrmFetchKit/blob/master/test/spec/integrationSpec.js). 

##API Reference
The current version supports the following operation:

##Fetch
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
##FetchMore
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
##FetchAll
To address the 5.000 records query limit of Dynamics CRM (a single request return at a maximum 5.000 records) provides the CrmFetchKit with the `FetchAll` method an option to load all records retunred by an query.

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

**Note:** This method supports only the asynchronous execution.

##Assign
The `Assign` method allows the modification of the owner of an CRM record.

````javascript
var contactid = '06569fb8-88d0-4588-bdb8-c20c19e29205',
	// the team is the new owner of the concact record
	teamid = '4797f323-76ac-4cf7-8342-b7c1bafd5154';

CrmFetchKit.Assign(contactid, 'contact', teamid, 'team')
	.then(function(){
		//..
	});
````
**Note:** The parameter for this method have change form the 1.x version of the CrmFetchKit. The old version supported only the assignment of `SystemUsers` where the current version supports `Teams` and `SystemUsers`.

###Support for Joins
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
###Support for asynchronous and synchronous execution
The methods `Fetch`, `FetchMore` and `Assign` support the options parameter `opt_async` (default is set to `true`). Due to the default value, will the library execute the operation in asynchronous mode when the very last parameter is omitted.

````javascript
CrmFetchKit.Fetch(query);
````
To executed the operation in synchronous mode, the last parameter must be set to `false` when invoking the function
````javascript
CrmFetchKit.Fetch(query, false);
````
The method `FetchAll` supports **only** the asynchronous execution.
#Installation
##Files
The GitHub folder `src` hosts two file: `CrmFetchKit.js`, `CrmFetchKit.min.js`, just download one of these files and deploy the script as web-resource to your CRM server.
##Bower.io
This module could be installed via [bower](http://bower.io/):
````
bower install crmfetchkit
````
##Build and dev. dependencies
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
#Testing
##Unit Test
A very simple unit-testing is implemented (based on [karma](http://karma-runner.github.io/0.12/index.html). The test only verifies that the module provides the correct API (`Fetch`, `FetchMore`, `FetchAll`, `Assign`).

Run the following command to execute the unit-tests:
````
gulp test
````
##Integration-tests
Part of build task is the file "SpecRunnerIntegration.html" generated. This HTML file contains all dependencies (e.g. `mocha.js`, `chai.js`, `jquery.js`...) so the you need only to deploy this single HTML file as web-resource your environment.
#Versions
##Version 2.x
The version 2.x of the library uses [Mocha.js](http://mochajs.org/) as testing framework (instead of [QUnit](http://qunitjs.com/)) and [Gulp.js](http://gulpjs.com/) for the task automation (linting, build, minify, etc.)

###Breaking Changes from version 1.x
- Before this version the `getValue` method returns an `string` for option-sets attributes. With the 2.x version, the method return a value of type `number`. See integration test `should retrieve the optionset-value as "number"`
- The "Assign" accepts now five attributes (`id`, `entityname`, `assigneeId`, `assigneeEntityName`, `opt_async`).
##Versions 1.x
Previous versions (1.x) of this library are available on CodePlex (http://crmfetchkit.codeplex.com/)
