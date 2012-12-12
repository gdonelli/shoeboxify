
//
// common.js 
//
// Code which is shared between Node.js back-end and Browser front-end
//



var _common = (function () 
{
    // constructor
    var common = function () {
    	// console.log('common constructor')
    };

    // prototype
    common.prototype = {
        	constructor		: common
    	};


    /* ================================= */

    common.prototype.objectToHTML =
		function _objectToHTML(object, title)  // returns html code
		{
			var html = '';

			html += '<div class="debug-object-dump">\n';
			html += '<link href="/style/debug.css"	type="text/css"	rel="stylesheet" />\n';
			html += '<script src="/script/debug.js"></script>';

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
				
				var isArray  = _isArray(obj);
				var isObject = _isObject(obj);
				var isError  = _isError(obj);

				if ( isArray || isObject || isError )
				{
					result += _indent(indentIndex);

					if (isArray)
						result += '[';
					else if (isObject)
						result += '{';
					else if (isError)
						result += '[Error]-{';

					result += '\n';
					
					for (var aKey in obj)
					{
						result += _indent(indentIndex) + '<div class="key-value-pair">\n\t';

						var childObject = obj[aKey];

						if ( _isExpandableObject(childObject) )
						{
							result += _indent(indentIndex) + '<span class="key">' + aKey + ' <a class="plus" onclick="debug_expand(this)">(-):</a></span>\n';
						}
						else
						{
							result += _indent(indentIndex) + '<span class="key">' + aKey + ':</span>\n';
						}

						// Recursive call...
						result += _indent(indentIndex) + '\t<span class="value">';

						if (_isArray(childObject))
							result += '<div class="array">';
						else if (aKey == "id")
							result += '<a class="id" onclick="debug_openString(this)">';

						// console.log(aKey + " == id ? " + (aKey == "id") );

						result += _compose( childObject, '', indentIndex+2 );

						if (_isArray(childObject))
							result += '</div>';
						else if (aKey == "id")
							result += '</a>';

						result += '</span>\n';
						
						result += _indent(indentIndex) + '</div>\n';
					}

					if (isArray)
						result += ']';
					else if (isObject)
						result += '}';
					else if (isError)
						result += '}-[Error]';

					result += '\n';

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
				else if ( obj === null )
				{
					result = '<span class="null">null</span>';
				}
				else
				{
					result = '<span class="string">' + objectType + ' [+] ' + obj.toString() + '</span>';	
				}

				return out + result;
			}

			function _isExpandableObject(obj)
			{
				var objectType = Object.prototype.toString.call( obj );

				return (	(objectType === '[object Array]')	|| 
							(objectType === '[object Object]')	||
							(objectType === '[object Error]')	);
			}

			function _isArray(obj)
			{
				var objectType = Object.prototype.toString.call( obj );
				
				return (objectType === '[object Array]');
			}

			function _isObject(obj)
			{
				var objectType = Object.prototype.toString.call( obj );
				
				return (objectType === '[object Object]');
			}

			function _isError(obj)
			{
				var objectType = Object.prototype.toString.call( obj );
				
				return (objectType === '[object Error]');
			}

			function _indent(index)
			{
				var result = '';

				for (var i = 0; i<index; i++)
				{
					result += '\t';		
				}

				return result;
			}
		};


    // return common
    return common;
})();

common = new _common();

if (exports)
{
	exports.objectToHTML = common.objectToHTML;
}


