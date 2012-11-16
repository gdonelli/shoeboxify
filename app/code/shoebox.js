
/*
 *		shoebox.js
 */

var		assert	= require('assert')	
	,	url 	= require('url')
	,	path 	= require('path')

	,	s3		= require('./s3')
	,	mongo	= require('./mongo')
	,	fb		= require('./fb')
	,	shoeboxify	= require('./shoeboxify')
	;

exports.add = 
	function(graphIDstr, userIDstr, quest, success_f, error_f)
	{
		var startDate = new Date();

		mongo.user.findOneFacebookObject( 
				userIDstr 
		 	,	graphIDstr
			,	function success(r) {
					if (r == null)
					{
						// The object is not present in the DB. Let's add a new entry...
						_addNew();
					}
					else 
					{
						// Object already in the mongo database!

						_exitWithSuccess(r, { already: true} );
					}
				}
			,	function error(e) {
					shoeboxify.error('mongo.object.find(' + graphIDstr + ', ' + userIDstr + ') failed');
					shoeboxify.error(e);

					_exitWithError(e);
				} );		

		/* ================================ */

		function _addNew()
		{
			fb.graph(graphIDstr, quest
				,	function success(fbObject) {
						_makeCopy(fbObject);
					}
				,	function error(e) {
						_exitWithError('Failed to lookup: ' + fbID + ' error:' + e);
					} );
		}

		function _makeCopy(fbObject)
		{
			_copyPhotoObject(quest, fbObject
				,	function success(copyObject) {
						_insertInMongo(fbObject, copyObject);
					} 
				,	function error(e){
						_exitWithError(e);
					} );
		}

		function _insertInMongo(source, copy)
		{
			assert(source.id == graphIDstr, 'source.id(' + source.id+ ') != graphIDstr(' + graphIDstr + ')');
			
			mongo.user.addFacebookObject(
					userIDstr
				,	graphIDstr
				,	source
				,	copy
				,	function success(r)
					{
						// console.log('Object inserted in Mongo!!! here it is:');
						// console.log(r);

						_exitWithSuccess(r, r[0]);
					}
				,	function error(e)
					{
						_exitWithError('Failed to insert Object in mongo');
					}
				)
		}

		function _exitWithSuccess(r, options)
		{
			var endDate = new Date();
			var timeLength = endDate.getTime() - startDate.getTime();

			// console.log( 'timeLength: ' + timeLength );

			if (success_f)
				success_f( r, { time: timeLength } );
		}

		function _exitWithError(errstring)
		{
			if (error_f)
				error_f(new Error(errstring));
		}


	}



/*
 *	success_f( copyObject )
 */

function _copyPhotoObject(quest, photoObject, success_f, error_f)
{
	// validate that this is a photo object
	if (! (photoObject.id && photoObject.from.id && photoObject.images && photoObject.picture) ) {
		if (error_f)
			error_f( new Error('photoObject failed validation') );

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

	function _assembleCopyObject()
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
				// console.log( imageDictionary );
				
				var copyObject = _assembleCopyObject();

				if (success_f)
					success_f(copyObject);
			}
			else
				if (error_f)
					error_f('error copying object');
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
	
	var finalFileName = photoName + '_' + datePiece + '_i' + index;

	return '/' + directory + '/' + finalFileName + extension;
}

