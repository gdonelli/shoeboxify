
//
// common.js 
//
// Code which is shared between Node.js back-end and Browser front-end
//



var _common = (function () 
{
    // constructor
    var common = function () {
    	console.log('common constructor')
    };

    // prototype
    common.prototype = {
        	constructor		: common
        ,	objectToHTML	: _objectToHTML
    	};


    /* ================================= */

	function _objectToHTML(object, title)  // returns html code
	{
		var html = '';

		html += '<div class="debug-object-dump">\n';
		html += '<link href="/stylesheets/debug.css"	type="text/css"	rel="stylesheet" />\n';
		html += '<script src="/javascripts/debug.js"></script>';

		if (title)
			html += '<div class="debug-object-dump-title">' + title + '</div>\n';

		html += _compose(object, '', 0);
		html += '</div>\n';

		return html;

		/* ============= */
		
		function _compose(obj, out, indentIndex)
		{
			if (indentIndex>10)
				return

			var result = '';
			var objectType = Object.prototype.toString.call( obj );
			
			var isArray = IsArray(obj);

			if ( IsExpandableObject(obj) )
			{
				result += Indent(indentIndex) + (isArray ? '[' : '{') + '\n';
				
				for (var aKey in obj)
				{
					result += Indent(indentIndex) + '<div class="key-value-pair">\n\t';

					var childObject = obj[aKey];

					if ( IsExpandableObject(childObject) )
					{
						result += Indent(indentIndex) + '<span class="key">' + aKey + ' <a class="plus" onclick="debug_expand(this)">(-):</a></span>\n';
					}
					else
					{
						result += Indent(indentIndex) + '<span class="key">' + aKey + ':</span>\n';
					}

					// Recursive call...
					result += Indent(indentIndex) + '\t<span class="value">';

					if (IsArray(childObject))
						result += '<div class="array">';
					else if (aKey == "id")
						result += '<a class="id" onclick="debug_openString(this)">';

					// console.log(aKey + " == id ? " + (aKey == "id") );

					result += _compose( childObject, '', indentIndex+2 );

					if (IsArray(childObject))
						result += '</div>';
					else if (aKey == "id")
						result += '</a>';

					result += '</span>\n';
					
					result += Indent(indentIndex) + '</div>\n';
				}

				result += Indent(indentIndex) + (isArray ? ']' : '}') + '\n';
			}
			else if ( objectType === '[object String]')
			{
				var isAbsoluteLink = (obj.substring(0, 4) == 'http');

				if (isAbsoluteLink)
					result += '<a class="link" onclick="debug_openString(this)">';

				result += '<span class="string">"';
				result += obj;
				result += '"</span>';

				if (isAbsoluteLink)
					result += '</a>';
			}
			else if ( objectType === '[object Number]')
			{
				result = '<span class="number">'+ obj + '</span>';
			}
			else if ( objectType === '[object Boolean]')
			{
				result = '<span class="boolean">'+ obj + '</span>';
			}

			return out + result;
		}

		function IsExpandableObject(obj)
		{
			var objectType = Object.prototype.toString.call( obj );

			return (	(objectType === '[object Array]') || 
						(objectType === '[object Object]') );
		}

		function IsArray(obj)
		{
			var objectType = Object.prototype.toString.call( obj );
			
			return (objectType === '[object Array]');
		}

		function Indent(index)
		{
			var result = '';

			for (var i = 0; i<index; i++)
			{
				result += '\t';		
			}

			return result;
		}

	}

    // return common
    return common;
})();

var common =  new _common();

