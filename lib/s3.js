
var		knox = require('knox')
	,	path = require('path')
	,	url = require('url')
	,	http = require("http")
	,	https = require("https")
	,	assert= require('assert')

	,	shoeboxify	= require('./shoeboxify')
	;


var _S3Client = (function() 
{
	// constructor
	var result = function(key, secret, bucket, region) {
		assert( (key != undefined),		's3 key is undefined');
		assert( (secret != undefined),	's3 secret is undefined');
		assert( (bucket != undefined),	's3 bucket is undefined');

		var options =	{	key: key
						,	secret: secret
						,	bucket: bucket	};

		if (region)
			options.region = region;

		this._client = knox.createClient(options);
	};

	// prototype
	result.prototype = {
			constructor: result

		,	client: client
	};

	function client()
	{
		return this._client;
	}
	
	function writeJSON( object, filepath, successF,  errorF )
	{
		exports.writeJSON( this._client, object, filepath, successF,  errorF );
	}

	return result;
})();


// exports.client = function(a, b, c) { return new _S3Client(a, b, c) };
// var sClient = new _S3Client( shoeboxify.s3.RW.key(), shoeboxify.s3.RW.secret(), shoeboxify.s3.bucket.test() );
// console.log('sClient ' + sClient );


function _s3client( access, bucket )
{
	var key		= shoeboxify.s3[access].key();
	var secret	= shoeboxify.s3[access].secret();
	var bucket	= bucket();

	assert( (key != undefined),		's3 key is undefined');
	assert( (secret != undefined),	's3 secret is undefined');
	assert( (bucket != undefined),	's3 bucket is undefined');

	return knox.createClient({
				   key: key
			,	secret: secret
			,	bucket: bucket
			,	region: 'us-west-2'
			});
}


exports.object = {
			read:		function(){ return _s3client( 'R',  shoeboxify.s3.bucket.object ); }
		,	readwrite:	function(){ return _s3client( 'RW', shoeboxify.s3.bucket.object ); }
		,	URL:		function(filepath){ return _URL(	shoeboxify.s3.bucket.object, filepath); }
		};

exports.cache = {
			read:		function(){ return _s3client( 'R',  shoeboxify.s3.bucket.cache ); }
		,	readwrite:	function(){ return _s3client( 'RW', shoeboxify.s3.bucket.cache ); }
		,	URL:		function(filepath){ return _URL(	shoeboxify.s3.bucket.cache, filepath); }
		};

exports.test = {
			read: 		function(){ return _s3client( 'R',  shoeboxify.s3.bucket.test ); }
		,	readwrite:	function(){ return _s3client( 'RW', shoeboxify.s3.bucket.test ); }
		,	URL:		function(filepath){ return _URL(	shoeboxify.s3.bucket.test, filepath); }
		};


function _URL(bucket, filepath)
{
	var result = 'https://s3-us-west-2.amazonaws.com/' + path.normalize(bucket() + '/' + filepath);

	return result;
}


// http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectPUT.html
/*
 * successF(ponse)
 * errorF(ErrorObj), ErrorObj.response
 */
exports.writeJSON =
	function( clientS3, object, filepath, successF,  errorF ) 
	{
		assert( clientS3,	arguments.callee.name + " clientS3 is undefined");
		assert( object,		arguments.callee.name + " object is undefined");
		assert( filepath,	arguments.callee.name + " clientS3 is undefined");

		var string = JSON.stringify(object);
		var questToS3 = clientS3.put(filepath,	{
					'Content-Length': string.length
			  	,	'Content-Type': 'application/json'
				,	'x-amz-acl': 'public-read'
			/*	, 	'x-amz-storage-class' : 'REDUCED_REDUNDANCY'	*/
			});
		
		questToS3.on('response', 
			function(ponse) {
				if (ponse.statusCode == 200) {
					if (successF)
						successF(ponse);
				}
				else {
					if (errorF) {
						var e = new Error('Failed with statusCode: ' + ponse.statusCode);
						e.response = ponse;
						errorF(e);
					}
				}
			});
		
		questToS3.end(string);

		return string;
	};


/*
 *	successF(total_byte_written)
 *	errorF( Error_obj )
 *	progressF( p ), p: {written, total, percent}
 *	
 */

exports.copyURL =
	function( clientS3, fileURL, filePath, successF, errorF, progressF )
	{
		assert( clientS3,	arguments.callee.name + " clientS3 is undefined");
		assert( fileURL,	arguments.callee.name + " fileURL is undefined");
		assert( filePath,	arguments.callee.name + " clientS3 is undefined");

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

				var putStream = clientS3.putStream(getPonse, filePath, headers, 
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

						if (progressF)
							progressF(progressObj);
					});

				putStream.on('error', 
					function(error) {
						console.log('stream->error: ' + error);
					});
				
				function ExitWithError(code, message)
				{
					var err = new Error(message);
					err.code = code;

					if (errorF)
						errorF( err );

				}

				function ExitWithSuccess()
				{
					if (successF)
						successF( Math.round(total) );					
				}

			});

		quest.end();
	}

