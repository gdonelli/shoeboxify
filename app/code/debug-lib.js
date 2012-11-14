
/*
 * Debug
 */
 

exports.ObjectToHTML = 
	function(object, title)
	{
		var html='';

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
				if (obj.startsWith('http'))
					result += '<a class="link" onclick="debug_openString(this)">';

				result += '<span class="string">"';
				result += obj;
				result += '"</span>';

				if (obj.startsWith('http'))
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
	}

exports.JSONtoHTML = 
	function(jsonString, title)
	{
		var object = JSON.parse(jsonString);

		return exports.ObjectToHTML(object);
	}



/* ========================================================================= */


function Indent(index)
{
	var result = '';

	for (var i = 0; i<index; i++)
	{
		result += '\t';		
	}

	return result;
}


function syntaxHighlight(json) {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}


function WriteObject(req, res)
{
	res.writeHead(200, {'Content-Type': 'text/html'});

	res.write('<html><body>');

	for(var aKey in req)
		if (req.hasOwnProperty(aKey))
  		{
			res.write( aKey + ": " + req[aKey] );
			res.write('<br>');
		}

	res.end('</body></html>');
}




