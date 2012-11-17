
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

exports.object = {};
exports.object.bucketName	= "shoeboxify.object";
exports.object.clientR	= function(){ return _getCachedClient(exports.object.bucketName, 'R' ); };
exports.object.clientRW	= function(){ return _getCachedClient(exports.object.bucketName, 'RW'); };

exports.test = {};
exports.test.bucketName	= "shoeboxify.test";
exports.test.clientR	= function(){ return _getCachedClient(exports.test.bucketName, 'R' ); };
exports.test.clientRW	= function(){ return _getCachedClient(exports.test.bucketName, 'RW'); };


var _clientCache = {
			test: {
					R:  null
				,	RW: null
			}
		,	object: {
					R:  null
				,	RW: null
			}
	}


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


function _s3client( bucket, access )
{
	var key		= shoeboxify.s3.key[access]();
	var secret	= shoeboxify.s3.secret[access]();

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
			return 'https://s3-us-west-2.amazonaws.com/' + path.normalize(bucket + '/' + filePath);			
		};

	return result;
}


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

exports.writeJSON =
	function( client, object, filePath, success_f /* (reponse) */,  error_f /* (error) */ ) 
	{
		exports.assert_client(client);
		assert(object != undefined, " object is undefined");
		exports.assert_path(filePath);
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
				if (ponse.statusCode == 200) {
					if (success_f)
						success_f(ponse);
				}
				else {
					if (error_f) {
						var e = new Error('Failed with statusCode: ' + ponse.statusCode);
						e.response = ponse;
						error_f(e);
					}
				}
			});
		
		questToS3.end(string);

		return string;
	};


exports.delete =
	function( client, filePath, success_f, error_f )
	{
		exports.assert_client(client);
		exports.assert_path(filePath);
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		var questToS3 = client.del(filePath);

		questToS3.on('response',
			function(ponse){
				if (ponse.statusCode >= 200 && ponse.statusCode < 300)
				{
					success_f();				
				}
				else
				{
					error_f();				
				}
				console.log(ponse.statusCode);
				console.log(ponse.headers);
			});

		questToS3.end();
	};

/**
 *
 *	success_f(total_byte_written)
 *	error_f( Error_obj )
 *	progress_f( p ), p: {written, total, percent}
 *	
 */

exports.copyURL =
	function( client, fileURL, filePath, success_f, error_f, progress_f )
	{
		exports.assert_client(client);
		exports.assert_path(filePath);
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

					if (error_f)
						error_f( err );

				}

				function ExitWithSuccess()
				{
					if (success_f)
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


exports.assert_client =
	function(client)
	{
		assert( client != undefined,		'client is undefined');
		assert( client.key != undefined,	'client.key is undefined');
		assert( client.secret != undefined,	'client.secret is undefined');
		assert( client.bucket != undefined,	'client.bucket is undefined');
	};


exports.assert_path =
	function(filePath)
	{
		assert( filePath != undefined,	'filePath is undefined');
		assert( _.isString(filePath),	'filePath is not string');
		assert( filePath.length > 1,	'filePath.length not valid');
	};

