module.exports = (function() {
	'use strict';

	// Type: JavaScript Implementation of the Entity Class
	function BusinessEntity() {

		this.Id = null;
		this.logicalName = null;
		this.attributes = {};
	}

	// Getter for the attributes
	// E.g.: entity.getValue('accountid') or contact.getValue('parentaccountid', 'name')
	BusinessEntity.prototype.getValue = function(attrname, opt_property) {

		var attr = this.attributes[attrname];

		if (attr) {

			var attrType = attr.type;

			switch (attrType) {

				case 'a:EntityReference':
					return (opt_property !== undefined) ? attr[opt_property] : attr.guid;

				case 'a:OptionSetValue':
					return (opt_property !== undefined) ? attr[opt_property] : attr.value;

				default:
					return attr.value;
			}
		}

		return null;
	};

	return BusinessEntity;
}());
