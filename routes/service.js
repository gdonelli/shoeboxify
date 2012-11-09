
/*
 *		Service API
 */

var 	https = require('https')
	,	url = require('url')
	,	path = require('path')

	,	s3 = require('../lib/s3')
	,	fb = require('./fb')

	,	shoebox = require('../lib/shoebox')
	,	shoeboxify = require('../lib/shoeboxify')
	, 	StringExtension = require('../lib/String-extension')
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
		var urlElements = url.parse(quest.url, true);
		var urlQuery = urlElements['query'];

		ponse.writeHead(200, { 'Content-Type': 'application/json' } );

		shoeboxify.debug(quest.url);

		var jsonResult;

		if ( !urlQuery || urlQuery['u'].length <= 0 )
		{
			ExitWithResult({	status: 1
							,   source: sourceURI
							,	 error: 'malformed request ?u= is empty' });

			shoeboxify.error('urlQuery is malformed');
		}
		else if ( !fb.isAuthenticated(quest) )
		{
			ExitWithResult({	status: 403
							,   source: sourceURI
							,	 error: 'User not logged-in in Shoeboxify' });
		}
		else
		{
			shoeboxify.log(urlQuery);
			
			var sourceURI = urlQuery['u'];
			var fbID =  _extractFacebookObjectID(sourceURI);

			if (fbID)
			{
				shoebox.add(fbID, fb.me(quest, 'id'), quest 
						,	function success(r)
							{
								ExitWithResult({	status: 0
												,	source: sourceURI
												,	  data: r });
							}
						,	function error(e)
							{
								ExitWithResult({	status: 1
												,	source: sourceURI
												,	 error: 'shoebox.add failed' });				
							}

					);
			}
			else
			{
				ExitWithResult({	status: 2
								,	source: sourceURI
								,	 error: 'Cannot find object id for source' });				
			}
		}

		function ExitWithResult(result)
		{
			ponse.end( JSON.stringify(result) );
		}
		
	}


/*
	function(quest, ponse)
	{
		_sevice_processURL(quest, ponse, 
			function(photoObject, exitFunction, jsonPartialResult)
			{

				_copyPhotoObject(quest, photoObject
					,	function success(copyID, copyURL) {
							jsonPartialResult.copyID  = copyID;
							jsonPartialResult.copyURL = copyURL;

							console.log('copyID:  ' + copyID);
							console.log('copyURL: ' + copyURL);

							return exitFunction(jsonPartialResult);
						} 
					,	function error(e) {
							jsonPartialResult.error = e.message;
							jsonPartialResult.status = 10;
							return exitFunction(jsonPartialResult);
						});


			} );


	}
*/



/*
 *	successF(copyID, copyURL)
 */

function _copyPhotoObject(quest, photoObject, successF, errorF)
{
	// validate that this is a photo object
	if (! (photoObject.id && photoObject.from.id && photoObject.images && photoObject.picture) ) {
		if (errorF)
			errorF( new Error('photoObject failed validation') );

		return;
	};

	var newName = _generatePhotoName( fb.me(quest, 'id'), photoObject.id, 'A', 'F' );

	var imageDictionary = _collectAllImages(photoObject);

	var s3client = s3.object.readwrite();

	var imageIndex = 0;

	var totCount 	 = 0;
	var successCount = 0;
	var errorCount	 = 0;

	for (var imageURL in imageDictionary)
	{
		// console.log(imageIndex);
		
		var meta = imageDictionary[imageURL];
		var newFilePath = _generateFilePath(newName, imageIndex++, meta, path.extname(imageURL));
		
		// console.log('original: ' + imageURL);
		// console.log('copy:     ' + s3.object.URL(newFilePath) );
		
		_copy2s3( s3client, imageURL, newFilePath);
		
		totCount++;
	}

	// console.log(imageDictionary);

	/* ============================================ */
	var totalBytesWrittenToS3 = 0;

	function _copy2s3( client, srcURL, path)
	{
		s3.copyURL( client, srcURL, path
			,	function success(total) {
					var s3copyURL = s3.object.URL(path);
					imageDictionary[srcURL].s3copyURL = s3copyURL

					// console.log('S3 -> ' +  s3copyURL + ' ('  + total/1024 + ' KB)' );			

					totalBytesWrittenToS3 += total;

					successCount++;
					_shouldEnd();
				}
			,	function error(e) {
					console.log('Failed -> ' +  imageURL);
					errorCount++;
					_shouldEnd();
				} 
			);			
	}

	function _copyObject()
	{
		var newObject = {};

		newObject.picture = imageDictionary[photoObject.picture].s3copyURL;
		newObject.source = imageDictionary[photoObject.source].s3copyURL;
		newObject.images = [];

		for (var index in photoObject.images)
		{
			var imageInfo = photoObject.images[index];

			newObject.images[index] = {};
			newObject.images[index].source = imageDictionary[imageInfo.source].s3copyURL;
		}

		return newObject;
	}

	function _shouldEnd()
	{
		if (totCount == (successCount + errorCount))
		{
			console.log('Total bytes written to S3: ' + totalBytesWrittenToS3/1024 + ' KB' );

			if (errorCount == 0)
			{
				console.log( imageDictionary );
				
				var copyObject = _copyObject();

				console.log( copyObject );

				var finalObject = {};

				finalObject.source = photoObject;
				finalObject.copy   = copyObject;

				var jsonPath = '/json/' + newName + '.json';
				s3.writeJSON( s3client, finalObject, jsonPath 
					,	function success() {

							var jsonURL = s3.object.URL(jsonPath);

							if (successF)
								successF(newName, jsonURL);
						}
					,	function error() {
							if (errorF)
								errorF();
						} );

			}
			else
				if (errorF)
					errorF();
		}
	}

	function _collectAllImages(photoObject)
	{
		var result = {};

		var pictureURL = photoObject.picture;

		result[pictureURL] = {};

		__addSource(photoObject);

		for (var i in photoObject.images) {
			var image_i = photoObject.images[i];
			__addSource(image_i);
		}

		return result;

		/* ===== */

		function __addSource(imageInfo)
		{
			var sourceURL = imageInfo.source;
			var sourceWidth	= imageInfo.width;
			var sourceHeight= imageInfo.height;
		
			if (result[sourceURL]) // Does it exist already?
			{
				var hitWidth  = result[sourceURL].width;
				var hitHeight = result[sourceURL].height;

				if ( hitWidth == imageInfo.width && 
					 hitHeight == imageInfo.height )
				{
					// all good, nothing to do
					return;
				}
				if (hitWidth == undefined && hitHeight == undefined)
				{
					// we have more information about a picture we saw already, we will add it
				}
				else
				{
					shoeboxify.error(	'Duplicate image with size not matching: ' + 
										hitWidth + 'x' + hitHeight + ' vs ' +
										sourceWidth + 'x' + sourceHeight);
				}
			}

			result[sourceURL] = { width:sourceWidth, height:sourceHeight };
		}
	}

}

function _generatePhotoName(ownerID, photoID, version, type)
{
	return ownerID + '_' + version + '_' + type + '_' + photoID;
}

function _generateFilePath(photoName, index, options, extension)
{
	var directory = 'picture'; // default directory

	var optionString = '';
	if (options && options.width && options.height)
	{
		var max = Math.max(options.width, options.height);		
		directory = '' + max

		if (directory.length <= 0) {
			directory = 'picture';
		}

	}

	var now = new Date();
	var datePiece = now.getUTCFullYear() + 'M' + now.getUTCMonth() + 'D' + now.getUTCDate() + 'H' + now.getUTCHours() + 'M' + now.getUTCMinutes();
	
	return '/' + directory + '/' + photoName + '_' + datePiece + '_i' + index + extension;
}

/*
 * Scafolding for a service which given an URL extracts the facebook ID
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
