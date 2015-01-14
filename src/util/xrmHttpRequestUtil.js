var soapParser = require('./soapXmlParser');
var BluePromise = require('bluebird');

module.exports = (function(){
	'use strict';

	function setXhrXrmHeaders(xhr){

		xhr.setRequestHeader("Accept", "application/xml, text/xml, */*");
        xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
        xhr.setRequestHeader("SOAPAction",
            "http://schemas.microsoft.com/xrm/2011/Contracts/Services/IOrganizationService/Execute");

		return xhr;
	}

	function buildXhrPostRequest(url, async){

        var xhr = new XMLHttpRequest();

		xhr.open("Post", url, async);

		xhr = setXhrXrmHeaders(xhr);

		return xhr;
	}

	function xrmHttpPostRequestSync(url, xml){

		var xhr = buildXhrPostRequest(url, false),
			result = null;

		xhr.send(xml);

		if(xhr.status === 200) {

			result = xhr.responseXML;
		}
		else {

			throw new Error(soapParser.getSoapError(xhr.responseXML));
		}

		return result;
	}

	function xrmHttpPostRequestAsync(url, xml){

		return new BluePromise(function(resolve, reject){

			var xhr = buildXhrPostRequest(url, true);

			xhr.onreadystatechange = function () {
				// completed
				if (xhr.readyState === 4) {

					if(xhr.status === 200) {

						resolve(xhr.responseXML);
					}
					else {
						reject(soapParser.getSoapError(xhr.responseXML));
					}
				}
			};

			xhr.send(xml);
		});
	}

	return {
		xrmHttpPostRequestSync: xrmHttpPostRequestSync,
		xrmHttpPostRequestAsync: xrmHttpPostRequestAsync
	};
}());
