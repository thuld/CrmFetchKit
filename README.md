#Project Description
Cross-Browser library that allows the execution of fetchxml-queries via JavaScript for Dynamics CRM using SOAP endpoint.

Just like the [CrmRestKit.js](http://crmrestkit.codeplex.com/) this framework uses the [promise](http://blogs.telerik.com/kendoui/posts/13-03-28/what-is-the-point-of-promises) capacities of jQuery to manage the complexity of asynchronous operation.
The code and the idea for this framework bases on the [CrmServiceToolkit](http://crmtoolkit.codeplex.com) developed by Daniel Cai.

##Version 2.x
The version 2.x of the library uses [Mocha.js](http://mochajs.org/) as testing framework (instead of [QUnit](http://qunitjs.com/) and [Gulp.js](http://gulpjs.com/) for the task automatisaton (linting, build, minify, etc.)

###Breaking Changes from version 1.x
- Before this version the `getValue` method returns an `string` for option-sets attributes. With the 2.x version, the method return a value of type `number`. See integration test `should retrive the optionset-value as "number"`
- The "Assign" accepts now five attributes (`id`, `entityname`, `assigneeId`, `assigneeEntityName`, `opt_async`).

## API Reference
The current version supports the following operation:
- `Fetch`
- `FetchMore`
- `FetchAll`
- `Assign`

##Documentation (2.x)
###Fetch
With the `Fetch` method is it possible to execute fetch-xml based query.
The method will resolve the promise with an array of `BusinessEntity` objects. These type supports the method `getValue(<%attributename%>)`.

The following code load all account records with the name `foobar` and prints the names to the console.

```javascript
var fetchxml = ['<fetch version="1.0">',
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
###FetchMore
In a situation where the develper needs more control over the retured data, the `FetchMore` method should be used. The method will resolve the promise with an object that supports the following properties:
- `totalRecordCount` (number)
- `moreRecords` (boolean)
- `pagingCookie` (string)
- `entityName` (string)
- `entities` (array ob `BusinessEntity` objects)

````javascript
var fetchxml = ['<fetch version="1.0"',
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
###FetchAll
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
Internaly use `FetchAll` the `FetchMore` method and the provided `pagingCookie` to load the pages until all records are loaded.

**Note:** This method supports only the asynchronous execution.

###Assign
The `Assign` methode allows the modification of the owner of an CRM record.

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
FetchXml support the joining via the "link-entity" tag. In case the query yields attributews of the linked entity, an alias must be provided to access these attributes with the `getValue()` method of the business-entity object.

The following query uses the alias `bu` to identify the attributes of the joined entity `businessunit`:

````javascript
// the query retrievs all account recrods that belong to the root business unit
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
###Support for asynchronous and asynchronous execution
The methods `Fetch`, `FetchMore` and `Assign` support the options parameter `opt_async` (default is set to `true`). Due to the default value, will the library execute the operation in asynchronous mode when the very last parameter is omitted.

````javascript
CrmFetchKit.Fetch(query);
````
To executed the operation in synchronous mode, the last paramter must be set to `false` when invoking the function
````javascript
CrmFetchKit.Fetch(query, false);
````
The method `FetchAll` supports **only** the asynchronous execution.

##Testing
###Unit Test
A very simple unit-testing is implemented. Basicly the test only verifies that the build task that generates the spec-runner combinats all files and that the most library provides the correct API (`Fetch`, `FetchMore`, `FetchAll`, `Assign`).

Run the following command to execute the unit-tests:
````
gulp test
````
###Integration-tests
Part of build task is the file "SpecRunnerIntegration.html" generated. This HTML file contains all dependencies (e.g. `mocha.js`, `chai.js`, `jquery.js`..., ) so the you need only to deploy this single HTML file as web-resource your environment.

The test suite executes 34 integration tests:
````cmd
passes:34
failures:0
duration: 17.27s

CrmFetchKit API
✓ should provided the public member "Fetch"
✓ should provided the public member "FetchMore"
✓ should provided the public member "FetchAll"
✓ should provided the public member "Assign"

Fetch
✓ should yield a single account record178ms
✓ should yield the id of the loaded record169ms
✓ should executed the query in synchronous mode168ms
✓ should yield the "name" of the account167ms
✓ should yield the "logicalName" of the entity167ms
✓ should yield the "category-code" (optionset) of the account167ms
✓ should yield the optionset-value as "number"167ms
✓ should yield the for an empty optionset-value "NULL" not "NaN"166ms
✓ should yield the "createdon" attribute167ms
✓ should yield the "createdon" as date170ms
✓ should yield the id of the lookup-value record166ms
✓ should yield the entity-technicalname of the lookup-value record167ms
✓ should yield the primary attr. of the referenced record166ms
✓ should yield the boolen attributes as boolean167ms
✓ should yield a single account records167ms
✓ should executed the query in asynchronous mode167ms
✓ should yield the intenral CRM attribute-type162ms

supports joins /linked-data
✓ should provided the joined data via the defined "alias"175ms

support for attributes for type enity-collection
✓ should fetch the required-attendes (type of EntityCollection /PartyList)167ms

FetchMore
✓ should support the asynchronous execution168ms
✓ should support the synchronous execution167ms
✓ should provided the "totalRecordcount" information166ms
✓ should provided the "moreRecords" information166ms
✓ should provided the "entityName" information167ms
✓ should provided the loaded records in the "entities" property168ms
✓ should provided the "pagingCookie" information168ms

FetchAll
✓ should execute the query in async mode162ms
✓ should load all contact records330ms

Assign
✓ should change the owner of the record to a team308ms
✓ should change the owner of the record to a another user267ms
````
**Note:** The tests for `Assign` requires an team and an existing user. Please see integration tests for details.

##Dependencies
The only dependency of the library is [jQuery (1.11.2)](http://jquery.com/download/).

##Build and dev. dependencies
To build the library from source-code the follwoing components are required:
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
