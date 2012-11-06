
/*
 *		Service API
 */

var 	https = require('https')
	,	url = require('url')

	,	fb = require('./fb')
	,	shoeboxify = require('../lib/shoeboxify')
	;

exports.route = {}; 

/*	API:	objectForURL
 *	URL:	/o4u
 *	args:	?u=<url>
 *
 *	example: /o4u?u=https://www.facebook...
 *
 * 	returns json:
 *		{
 *			status:	  0 -> success
 *					  1 -> malformed request
 *					  2 -> Failed to look up Facebook Object
 *					403 -> User not logged-in in Shoeboxify
 *		}
 */

exports.route.objectForURL = '/o4u';

exports.objectForURL = 
	function(quest, ponse)
	{
		_sevice_processURL(quest, ponse);
	}


function _extractFacebookObjectID( srcString )
{
	if (srcString.startsWith('http'))
	{
		// https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf

		if (srcString.indexOf('photo.php?') > 0 && srcString.indexOf('fbid=') > 0 )
		{
			var stringElements = url.parse(srcString, true);
			var stringQuery = stringElements['query'];
			var fbid = stringQuery['fbid'];

			return fbid;
		}

		// https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg
		
		var last4chars = srcString.substring((srcString.length-4), srcString.length );

		if ( last4chars == '.jpg')
		{
			var srcStringSpliyElements = srcString.split('/');

			var lastPathComponent = srcStringSpliyElements[srcStringSpliyElements.length-1];

			var numbers = lastPathComponent.split('_');

			var canditateResult = numbers[1];

			var isnum = /^\d+$/.test(canditateResult);

			if (isnum)
				return canditateResult;
		}
	}

	return undefined;
}

/*	API:	Copy Object
 *	URL:	/cp
 *	args:	?u=<url>
 *
 *	example: /cp?u=https://www.facebook...
 *
 * 	returns json:
 *		{
 *			status:	  0 -> success
 *		}
 */

exports.route.copyObject = '/cp';


exports.copyObject = 
	function(quest, ponse)
	{
		_sevice_processURL(quest, ponse, 
			function(photoObject, exitFunction, jsonPartialResult)
			{
				// validate that this is a photo object
				if (! (photoObject.id && photoObject.from.id && photoObject.images && photoObject.picture) ) {

					jsonPartialResult.status = 10;

					return exitFunction(jsonPartialResult);
				};

				var copyFileName = _copyFileName(photoObject);

				console.log(copyFileName);

				return exitFunction(jsonPartialResult);
			} );

		/* ====================== */

		function _copyFileName(photoObject)
		{
			var now = new Date();
			
			var dateSuffix = now.getUTCFullYear() + '_' + now.getUTCMonth() + '_' + now.getUTCDate() + '_' + now.getUTCHours() + '_' + now.getUTCMinutes();
			var version = 'A';

			return photoObject.from.id + '_' + version + '_' + photoObject.id + '_' + dateSuffix;
		}

	}


/*
 * Given a URL extracts the facebook ID
 */

function _sevice_processURL(quest, ponse, processObjectF)
{
	var urlElements = url.parse(quest.url, true);
	var urlQuery = urlElements['query'];

	ponse.writeHead(200, { 'Content-Type': 'application/json' } );

	shoeboxify.debug(quest.url);

	var jsonResult;

	if ( !urlQuery || urlQuery['u'].length <= 0 )
	{
		ExitWithResult({
				status: 1
			,   source: sourceURI
			,	  error: 'malformed request ?u= is empty' 
		} );

		shoeboxify.error('urlQuery is malformed');
	}
	else if ( !fb.isAuthenticated(quest) )
	{
		ExitWithResult({
				status: 403
			,   source: sourceURI
			,	  error: 'User not logged-in in Shoeboxify' 
		} );

	}
	else
	{
		shoeboxify.log(urlQuery);
		
		var sourceURI = urlQuery['u'];
		var fbID =  _extractFacebookObjectID(sourceURI);

		if (fbID)
		{
			fb.graph( fbID, quest,
				function success(fbObject)
				{
					var result = {
							status: 0
						,   source: sourceURI
						,     data: fbID 
						};

					if (processObjectF)
						processObjectF(fbObject, ExitWithResult, result);
					else
					{
						result.graphObject = fbObject
						ExitWithResult(result);
					}
				},
				function error(error)
				{
					ExitWithResult(	{
							status: 2
						,   source: sourceURI
						,    error: 'Failed to lookup: ' + fbID + ' error:' + error
						} );

				} );
		}
		else
		{
			ExitWithResult({
					status: 2
				,	source: sourceURI
				,	 error: 'Cannot find object id for source'
						} );				
		}
	}

	function ExitWithResult(result)
	{
		ponse.end( JSON.stringify(result) );
	}
	
}
