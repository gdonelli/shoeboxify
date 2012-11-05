
var		knox = require('knox')
	,	path = require('path')
	,	http = require("http")
	,	https = require("https")
	,	assert= require('assert')

	,	shoeboxify	= require('./shoeboxify')


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

exports.client = {
		object: {
			 R: function(){ return _s3client( 'R',  shoeboxify.s3.bucket.object ); }
		,	RW: function(){ return _s3client( 'RW', shoeboxify.s3.bucket.object ); }
		}

	,	cache: {
			 R: function(){ return _s3client( 'R',  shoeboxify.s3.bucket.cache ); }
		,	RW: function(){ return _s3client( 'RW', shoeboxify.s3.bucket.cache ); }
		}
			
	,	test: {
			 R: function(){ return _s3client( 'R',  shoeboxify.s3.bucket.test ); }
		,	RW: function(){ return _s3client( 'RW', shoeboxify.s3.bucket.test ); }
		}
	};

exports.bucket = {
		object: {
			 URL: function(filepath){ return _URL(shoeboxify.s3.bucket.object, filepath); }
		}

	,	cache: {
			 URL: function(filepath){ return _URL(shoeboxify.s3.bucket.cache, filepath); }
		}
			
	,	test: {
			 URL: function(filepath){ return _URL(shoeboxify.s3.bucket.test, filepath); }
		}
}

function _URL(bucket, filepath)
{
	var result = 'https://s3-us-west-2.amazonaws.com/' + path.normalize(bucket() + '/' + filepath);

	return result;
}

// http://docs.amazonwebservices.com/AmazonS3/latest/API/RESTObjectPUT.html

exports.writeJSON =
	function( clientS3, object, filepath, done /* (ponse) */ ) 
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
				if (done)
					done(ponse);
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
	function( clientS3, url, filepath, successF, errorF, progressF )
	{
		assert( clientS3,	arguments.callee.name + " clientS3 is undefined");
		assert( url,		arguments.callee.name + " url is undefined");
		assert( filepath,	arguments.callee.name + " clientS3 is undefined");

		http.get(url, 
			function(getPonse){

				// console.log('getPonse.statusCode: ' + getPonse.statusCode);

				if (getPonse.statusCode != 200)
				{
					var errMessage = 'GET ' + url + ' failed, statusCode:' + getPonse.statusCode;
					
					return ExitWithError(getPonse.statusCode, errMessage);
				}

				var headers = {
						'Content-Length': getPonse.headers['content-length']
					,	'Content-Type': getPonse.headers['content-type']
					,	'x-amz-acl': 'public-read'
				};

				var written = 0;
				var total = 0;

				var putStream = clientS3.putStream(getPonse, filepath, headers, 
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
									ExitWithError(1, 'Couldnt complete file (' + url + ') streaming to S3:'+filepath);
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
						successF(total);					
				}

			});
	}

