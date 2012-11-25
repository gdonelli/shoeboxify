/*

========================[   Memento   ]========================

Memento rappresent a user memory/entry (example: a photo). 
It corresponds to some data stored in S3 and some meta-data 
stored in the Mongo DB.

The Memento module abstracts from the accessing directly the 
mongo db (mongo.js) and manipulation on amazon S3 (s3.js)

Setup:
			memento.init
			memento.initUser

Operations:
			memento.removeId
			memento.findId
			memento.addFacebookObject

================================================================

*/


var		assert	= require('assert')	
	,	url 	= require('url')
	,	path 	= require('path')
	,	_		= require('underscore')

	,	fb		= require('./fb')
	,	s3		= require('./s3')
	,	mongo	= require('./mongo')
	,	handy	= require('./handy')
	;


var memento = exports;

memento.init =
	function(success_f, error_f)
	{
		mongo.init(
			function success(c) {
				assert(c != undefined, 'mongo.init returned undefined collection');

				if (success_f)
					success_f();
			}
		,	function error(e) {
				if (error_f)
					error_f(e);
			} );
	};


memento.user = {};

memento.initUser =
	function(userId, success_f, error_f)
	{
		assert( userId != undefined, 'userId is undefined');
		handy.assert_f(success_f, false);
		handy.assert_f(error_f, false);

		mongo.memento.init(userId
			,	function success(collection) {
					assert(collection != undefined, 'user collection is undefined');
					if (success_f)
						success_f();
				}
			,	function error(e) {
					if (error_f)
						error_f(e);
				} );
	};

memento.removeId =
	function(userId, mongoId, success_f /* ( elapsedTime ) */, error_f /* (error) */)
	{
		assert( userId != undefined, 'userId is undefined');
		assert( mongoId != undefined, 'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);
		var startTimestamp = new Date();

		mongo.memento.findId(userId, mongoId
			,	function success(entry) 
				{
					assert(entry != undefined, 'found entry is undefined');
					_remove(entry);
				}
			,	function error(e)
				{
					console.error('mongo.memento.findId failed ' + e );
					error_f(e);	
				} 
			);

		/* =================================================== */
		
		function _remove(entry)
		{
			mongo.memento.removeId(userId, mongoId
				,	function mongoSuccess() {
						_deleteFilesFromS3(entry
							,	function s3success() 
								{
									success_f(handy.elapsedTimeSince(startTimestamp));
								}
							,	function s3error(e)
								{
									console.error('_deleteFilesFromS3 failed ' + e );
									error_f(e);
								});
					}
				,	function mongoError(e) {
						console.error('mongo.memento.removeId failed ' + e );
						error_f(e);
					});			
		}

		function _getCopyURLsForPhotoEntry(entry)
		{
			var result = [];
			var copyObject = mongo.memento.entity.getCopyObject(entry);

			result.push(copyObject.picture);
			result.push(copyObject.source);

			for (var i in copyObject.images)
				result.push(copyObject.images[i].source);

			return result;
		}

		function _deleteFilesFromS3(entry, success_f, error_f)
		{
			// we only know how to deal with photo objects
			var entryType = mongo.memento.entity.getType(entry);
			assert(entryType == mongo.const.mementoPhotoType, 'found entry is not mementoPhotoType is ' + entryType);

			var photoURLs = _getCopyURLsForPhotoEntry(entry);
			assert(photoURLs.length > 0 , 'photoURLs.length expected to be > 0');

			var info = s3.getInfoForURLs(photoURLs);

			var s3client = s3.getClient(info.bucket, 'RW');

			s3.delete(s3client, info.paths
				,	function success(num) {
						// console.log('removed ' +  num + ' s3 files');
						success_f();
					} 
				,	function error(e) {
						error_f(e);
					} );
		}

	};

memento.findId =
	function(userId, mongoId, success_f /* (entry) */, error_f /* (error) */)
	{
		mongo.memento.findId(userId, mongoId, success_f, error_f);
	};

memento.addFacebookObject =
	function(userId, graphId, quest, success_f /* (newEntry, meta) */, error_f)
	{
		var startDate = new Date();

		mongo.memento.findOneFacebookObject( 
				userId 
		 	,	graphId
			,	function success(r) {
					if (r == null)
					{
						// The object is not present in the DB. Let's add a new entry...
						_addNew();
					}
					else 
					{
						// Object already in the mongo database!

						_exitWithSuccess( r, { already: true } );
					}
				}
			,	function error(e) {
					console.error('mongo.object.find(' + graphId + ', ' + userId + ') failed');
					console.error(e);

					_exitWithError(e);
				} );		

		/* ========================================================================== */

		function _addNew()
		{
			fb.graph(graphId, quest
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
			assert(source.id == graphId, 'source.id(' + source.id+ ') != graphId(' + graphId + ')');
			
			mongo.memento.addFacebookObject(
					userId
				,	graphId
				,	source
				,	copy
				,	function success(r)
					{
						assert( r != undefined, 'added a new entry but that is undefined');
						_exitWithSuccess(r, {} );
					}
				,	function error(e)
					{
						_exitWithError('Failed to insert Object in mongo');
					}
				)
		}

		function _exitWithSuccess(r, meta)
		{
			var allMeta = { time: handy.elapsedTimeSince(startDate) };

			if (meta)
				allMeta = _.extend(meta, allMeta);

			if (success_f)
				success_f( r, allMeta );
		}

		function _exitWithError(errstring)
		{
			if (error_f)
				error_f(new Error(errstring));
		}
	};



/*
 *	copy Facebook URLs to S3
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

	var s3client = s3.production.clientRW();

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
		// console.log('copy:     ' + s3.production.URL(newFilePath) );
		
		_performOneCopyOperationToS3( s3client, imageURL, newFilePath);
		
		totCount++;
	}

	// console.log(imageDictionary);

	/* ============================================ */
	var totalBytesWrittenToS3 = 0;

	function _performOneCopyOperationToS3( client, srcURL, path)
	{
		s3.copyURL( client, srcURL, path
			,	function success(total) {
					var s3copyURL = client.URLForPath(path);
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
			// console.log('Total bytes written to S3: ' + totalBytesWrittenToS3/1024 + ' KB' );

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
					console.error(	'Duplicate image with size not matching: ' + 
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

	var DEFAULT_IMAGE_SIZES = [ 2048, 960, 720, 600, 480, 320, 240, 180, 130 ];

	if (options && options.width && options.height)
	{
		var imageDimesion = Math.max(options.width, options.height);		
			
		for (var i in DEFAULT_IMAGE_SIZES)
		{
			var size_i = DEFAULT_IMAGE_SIZES[i];

			if ( imageDimesion >= size_i ) {
				directory = size_i.toString();
				break;
			}
		}
	}

	var now = new Date();
	var datePiece = now.getUTCFullYear() + 'M' + now.getUTCMonth() + 'D' + now.getUTCDate() + 'H' + now.getUTCHours() + 'M' + now.getUTCMinutes();
	
	var finalFileName = photoName + '_' + datePiece + '_i' + index;

	return '/' + directory + '/' + finalFileName + extension;
}

