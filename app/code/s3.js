/*
 * 		s3
 */

var		assert= require('assert')
	,	knox = require('knox')
	,	path = require('path')
	,	url  = require('url')
	,	http = require("http")
	,	https = require("https")
	,	_ = require("underscore")

	,	handy = require('./handy')
	,	shoeboxify	= require('./shoeboxify')
	;


var s3 = exports;

/* ====================================================== */
/* ====================================================== */
/* ===============[   Built in Clients   ]=============== */
/* ====================================================== */
/* ====================================================== */

/* 
 *
 *	 client.URLForPath(aPath) 
 *
 *   returns the URL of a file for a given path
 *
 */

var CLIENT_CACHE_DURATION = 60 * 1000; // 1 minute

s3.object = {};
s3.object.bucketName= "shoeboxify.object";
s3.object.clientR	= function(){ return _getCachedClient(s3.object.bucketName, 'R' ); };
s3.object.clientRW	= function(){ return _getCachedClient(s3.object.bucketName, 'RW'); };

s3.test = {};
s3.test.bucketName	= "shoeboxify.test";
s3.test.clientR		= function(){ return _getCachedClient(s3.test.bucketName, 'R' ); };
s3.test.clientRW	= function(){ return _getCachedClient(s3.test.bucketName, 'RW'); };


s3.validBucket = 
	function(bucket)
	{
		return (bucket == s3.test.bucketName ||
				bucket == s3.object.bucketName);		
	}


s3.getClient = 
	function(bucket, permission)
	{
		assert( s3.validBucket(bucket), bucket + ' is not valid' );

		return _getCachedClient(bucket, permission);
	};


var _clientCache = {
			test: {
					R:  null
				,	RW: null
			}
		,	object: {
					R:  null
				,	RW: null
			}
	};


function _getCachedClient(bucketName, permission)
{
	var bucketEndName = bucketName.split('.')[1];

	assert(bucketEndName == 'test' || bucketEndName == 'object', 'bucketEndName is not valid: ' + bucketEndName);

	if (_clientCache[bucketEndName][permission] == null) {

		// console.log('_getCachedClient ' + bucketEndName + ' ' + permission );

		_clientCache[bucketEndName][permission] = _s3client(bucketName, permission);
		_clearCache(bucketEndName, permission);
	}

	return _clientCache[bucketEndName][permission];

	/* ========================================================== */
	
	function _clearCache(n, p)
	{
		setTimeout( function() {
			console.log('Clearning S3 Client ' + n + ' ' + p );
			_clientCache[n][p] = null;
		}, CLIENT_CACHE_DURATION);

	}
}

var S3_HOST_NAME = 's3-us-west-2.amazonaws.com';

 // do not use directly. Use _getCachedClient instead

function _s3client( bucket, permission )
{
	var key		= shoeboxify.s3.key[permission]();
	var secret	= shoeboxify.s3.secret[permission]();

	assert( (key != undefined),		's3 key is undefined');
	assert( (secret != undefined),	's3 secret is undefined');
	assert( (bucket != undefined),	's3 bucket is undefined');

	var result = knox.createClient({
				   key: key
			,	secret: secret
			,	bucket: bucket
			,	region: 'us-west-2'
			});

	result.URLForPath = 
		function(filePath) {
			return 'https://' + S3_HOST_NAME + '/' + path.normalize(bucket + '/' + filePath);			
		};

	return result;
}


/*
 *	Given a URL returns {	bucket: ... , 
 *						,	  path: ... } 
 */

s3.getInfoForURL =
	function(theURL)
	{
		var result = {};

		var urlElements = url.parse(theURL);
		assert( urlElements.host == S3_HOST_NAME, 'url host (' + urlElements.host + ') doesnt match expected s3 host:' + S3_HOST_NAME);

		var urlPath = urlElements.path;
		var urlPathElements = urlPath.split('/');

		var s3Bucket = urlPathElements[1];
		var s3Path = '';
		
		for (var i=2; i<urlPathElements.length; i++) {
			s3Path += '/' + urlPathElements[i];
		}

		result.path	 = s3Path;
		result.bucket= s3Bucket;

		return result;	
	};


/*
 *	Given a URL returns {	bucket: ... , 
 *							 paths: [...] } 
 *
 *  if the URLs are on a different bucket it will throw an exception
 */

s3.getInfoForURLs =
	function(arrayOfURLs)
	{
		var result = {};

		result.bucket = null;
		result.paths = [];

		for (var i in arrayOfURLs)
		{
			var URL_i = arrayOfURLs[i];
			var info_i = s3.getInfoForURL(URL_i);

			if (!result.bucket)
				result.bucket = info_i.bucket;
			else
				assert(result.bucket == info_i.bucket, ' URLs are in different buckets');

			result.paths.push(info_i.path);
		}

		return result;
	};


/* =================================================== */
/* =================================================== */
/* =================[  Module API  ]================== */
/* =================================================== */
/* =================================================== */



// http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectPUT.html
/*
 * success_f(ponse)
 * error_f(ErrorObj), ErrorObj.response
 */

s3.writeJSON =
	function( client, object, filePath, success_f /* (reponse) */,  error_f /* (error) */ ) 
	{
		s3.assert_client(client);
		assert(object != undefined, " object is undefined");
		s3.assert_path(filePath);
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		var string = JSON.stringify(object);
		var questToS3 = client.put(filePath,	{
					'Content-Length': string.length
			  	,	'Content-Type': 'application/json'
				,	'x-amz-acl': 'public-read'
			/*	, 	'x-amz-storage-class' : 'REDUCED_REDUNDANCY'	*/
			});
		
		questToS3.on('response', 
			function(ponse) {
				if (ponse.statusCode == 200)
				{
					success_f(ponse);
				}
				else
				{
					var e = new Error('Failed with statusCode: ' + ponse.statusCode);
					e.response = ponse;
					error_f(e);
				}
			});
		
		questToS3.on('error', 
			function(e) { error_f(e); } );

		questToS3.end(string);

		return string;
	};


function _s3_delete_file(client, filePath, success_f /* (reponse) */,  error_f /* (error) */ ) 
{
	s3.assert_client(client);
	assert(filePath != undefined, 'filePath is undefined' );
	assert(_.isString(filePath), 'filePath is not a string');	
	handy.assert_f(success_f);
	handy.assert_f(error_f);

	client.deleteFile(filePath,
		function(err, ponse){
			if (err)
				error_f(err);
			else if (ponse.statusCode >= 200 && ponse.statusCode < 300) 
			{
				success_f(ponse);	
			}
			else
			{
				var e = new Error('Failed with statusCode: ' + ponse.statusCode);
				e.response = ponse;
				error_f(e);
			}
		} );
}


s3.delete =
	function( client, filePath_or_arrayOfPaths, success_f /* (numOfFilesRemoved) */,  error_f /* (error) */ ) 
	{
		s3.assert_client(client);
		assert(filePath_or_arrayOfPaths != undefined, 'filePath_or_arrayOfPaths ios undefined' );
		assert(_.isString(filePath_or_arrayOfPaths) || _.isArray(filePath_or_arrayOfPaths), 'filePath_or_arrayOfPaths not a string or array');	
		handy.assert_f(success_f);
		handy.assert_f(error_f);
	
		var filesToRemove;

		if ( _.isString(filePath_or_arrayOfPaths) )
			filesToRemove = [ filePath_or_arrayOfPaths ];
		else if ( _.isArray(filePath_or_arrayOfPaths) )
			filesToRemove = filePath_or_arrayOfPaths;
		else
			assert('filePath_or_arrayOfPaths is neither string or array');

		assert(filesToRemove.length > 0, 'filesToRemove.length is not > 0');

		var removeIndex = 0;
		var successCount = 0;
		var errorCount = 0;

		_removeStep();

		/* ============== */

		function _removeStep()
		{
			if (successCount + errorCount == filesToRemove.length)
				return _end();

			var file_i = filesToRemove[removeIndex++];

			_s3_delete_file(client, file_i
				,	function success(reponse)
					{
						successCount++;
						_removeStep();
					}
				,	function error(error)
					{
						errorCount++;
						_removeStep();
					} );
		}

		function _end()
		{
			if (success_f)
				success_f(successCount)
		}
	};

/*
 * deleteMultiple doesn't seems to work. see:
 *   https://github.com/LearnBoost/knox/issues/121
 */


s3.delete_buggy =
	function( client, filePath_or_arrayOfPaths, success_f /* (reponse) */,  error_f /* (error) */ ) 
	{
		s3.assert_client(client);
		assert(filePath_or_arrayOfPaths != undefined, 'filePath_or_arrayOfPaths ios undefined' );
		assert(_.isString(filePath_or_arrayOfPaths) || _.isArray(filePath_or_arrayOfPaths), 'filePath_or_arrayOfPaths not a string or array');	
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		// console.log(typeof filePath_or_arrayOfPaths);

		var deleteMethod = null;

		if ( _.isString(filePath_or_arrayOfPaths) )
			deleteMethod = 'deleteFile';
		else if ( _.isArray(filePath_or_arrayOfPaths) )
			deleteMethod = 'deleteMultiple';

		assert(deleteMethod != null, 'Couldnt find method to deal with input type');

		client[deleteMethod](filePath_or_arrayOfPaths,
			function(err, ponse){
				if (err)
					error_f(err);
				else if (ponse.statusCode >= 200 && ponse.statusCode < 300) 
				{
					console.log('deleteMethod: ' + deleteMethod);
					console.log('ponse.statusCode: ' + ponse.statusCode);
					
					console.log('ponse.headers: ' + ponse.headers);
					console.log(ponse.headers);

					success_f(ponse);

					var bufferString = '';

					ponse.on('data',
						function (chunk) {
							bufferString += chunk;
						});

					ponse.on('end',	function () {
							console.log(deleteMethod + ' response:');
							console.log(bufferString );
						});
				}
			} );
	};


/**
 *
 *	success_f(total_byte_written)
 *	error_f( Error_obj )
 *	progress_f( p ), p: {written, total, percent}
 *	
 */

s3.copyURL =
	function( client, fileURL, filePath, success_f, error_f, progress_f )
	{
		s3.assert_client(client);
		s3.assert_path(filePath);
		handy.assert_http_url(fileURL);
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		var urlElements = url.parse(fileURL);

		// console.log(urlElements);

		var options = {
				hostname	:	urlElements.hostname
			,	path		:	urlElements.path
		};

		var methodObject = (urlElements['protocol'] == 'https' ? https : http );

		var quest = methodObject.request(options, 
			function(getPonse){

				// console.log('getPonse.statusCode: ' + getPonse.statusCode);

				if (getPonse.statusCode != 200)
				{
					var errMessage = 'GET ' + fileURL + ' failed, statusCode:' + getPonse.statusCode;
					
					return ExitWithError(getPonse.statusCode, errMessage);
				}

				var headers = {
						'Content-Length': getPonse.headers['content-length']
					,	'Content-Type': getPonse.headers['content-type']
					,	'x-amz-acl': 'public-read'
				};

				var written = 0;
				var total = 0;

				var putStream = client.putStream(getPonse, filePath, headers, 
					function(err, streamPonse){
				
						streamPonse.on('end',
							function() {
								// console.log('streamPonse.on[end] written:' + written + ' total:' + total );

								if  ( written == total && total != 0 ) 
								{
									ExitWithSuccess();
								}
								else
								{
									ExitWithError(1, 'Couldnt complete file (' + fileURL + ') streaming to S3:'+filePath);
									getPonse.destroy();
									streamPonse.destroy();
								}
							});

					});

				putStream.on('progress',
					function(progressObj) {
						written	= progressObj.written;
						total	= progressObj.total;
						// console.log('stream->progressObj.percent: ' + progressObj.percent );

						if (progress_f)
							progress_f(progressObj);
					});

				putStream.on('error', 
					function(error) {
						console.log('stream->error: ' + error);
					});
				
				function ExitWithError(code, message)
				{
					var err = new Error(message);
					err.code = code;

					error_f( err );
				}

				function ExitWithSuccess()
				{
					success_f( Math.round(total) );					
				}

			});

		quest.end();
	};


/* ============================================== */
/* ============================================== */
/* =================[  Utils  ]================== */
/* ============================================== */
/* ============================================== */


s3.assert_client =
	function(client)
	{
		assert( client != undefined,		'client is undefined');
		assert( client.key != undefined,	'client.key is undefined');
		assert( client.secret != undefined,	'client.secret is undefined');
		assert( client.bucket != undefined,	'client.bucket is undefined');
	};


s3.assert_path =
	function(filePath)
	{
		assert( filePath != undefined,	'filePath is undefined');
		assert( _.isString(filePath),	'filePath is not string');
		assert( filePath.length > 1,	'filePath.length not valid');
	};

