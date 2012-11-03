
/*
 * GET users listing.
 */

var knox = require('knox');

/**********************/
/* Facebook App Stuff */
/**********************/

exports.appID = function() {
		return _env('APP_ID');
	};

exports.appSecret = function() {
		return _env('APP_SECRET');
	};

exports.appPermissions = function() {
		var result = '';

		// For email notifications
		result += 'email, '; 

		// Obviously this is what Shoeboxify is about
		result += 'user_photos, friends_photos, ';

		// More subtle: some photos are posted as 
		// status updates and we need this permission to access it
		result += 'user_status, friends_status, ';

		return result;
	};

exports.dialogRedirectURL = function(req) {
		var reqHeaders = req.headers;
		var reqHost    = reqHeaders.host;
		
		return 'http://' + reqHost + '/facebook-response';
	}


/***********************/
/* Amazon Web Services */
/***********************/

function _s3client( access, bucket )
{
	var key		= exports.s3[access].key();
	var secret	= exports.s3[access].secret();
	var bucket	= bucket();

	console.log( '[ %s, %s, %s ]', key, secret, bucket);

	return knox.createClient({
				   key: key
			,	secret: secret
			,	bucket: bucket
			});
}


exports.s3 = {
		R: {
		     key: function(){ return _env('S3_R_KEY');		}
		, secret: function(){ return _env('S3_R_SECRET');	}
		}

	,	RW: {
		     key: function(){ return _env('S3_RW_KEY');		}
		, secret: function(){ return _env('S3_RW_SECRET');	}
		}

	,	bucket: {
			object: function(){ return _env('S3_OBJECTS_BUCKET');	}
		,	 cache: function(){ return _env('S3_CACHE_BUCKET');		}
		,	  test: function(){ return _env('S3_TEST_BUCKET');		}
		}
	};


exports.s3.client = {
		object: {
			 R: function(){ return _s3client( 'R',  exports.s3.bucket.object ); }
		,	RW: function(){ return _s3client( 'RW', exports.s3.bucket.object ); }
		}

	,	cache: {
			 R: function(){ return _s3client( 'R',  exports.s3.bucket.cache ); }
		,	RW: function(){ return _s3client( 'RW', exports.s3.bucket.cache ); }
		}
			
	,	test: {
			 R: function(){ return _s3client( 'R',  exports.s3.bucket.test ); }
		,	RW: function(){ return _s3client( 'RW', exports.s3.bucket.test ); }
		}
	};


exports.s3_R_objectsClient = function() {
		return knox.createClient({
					   key: exports.s3.R.key()
				,	secret: exports.s3.R.secret()
				,	bucket: exports.s3.bucket.objects()
				});
	};

exports.s3_RW_objectsClient = function() {
		return knox.createClient({
					   key: exports.s3.RW.key()
				,	secret: exports.s3.RW.secret()
				,	bucket: exports.s3.bucket.objects()
				});
	};


/**********/
/* Routes */
/**********/

exports.facebookLoginPath = function() {
		return '/facebook-login';
	};

exports.facebookResponsePath = function() {
		return '/facebook-response';
	};

exports.objectForURL = function() {
		return '/o4u';
	};


/***********/
/* Logging */
/***********/

exports.log  = function(string) {
		console.log(string);
	};

exports.debug  = function(string) {
		console.log(string);
	};

exports.error  = function(string) {
		console.error( '***** ERROR: ' + string);
	};

/*****************/
/* Miscellaneous */
/*****************/

function _env(name)
{
	var result =  process.env[name];

	if (result && result.length > 4)
		return result;
	else {
		exports.error('Cannot find env[' + name + ']');
		return '';
	}
}

exports.sessionSecret = function() 
	{
		return _env('SESSION_SECRET');
	};

exports.sessionDatabaseName = function() 
	{
		return _env('SESSION_DB_NAME');
	};

exports.sessionDatabaseURL = function() 
	{
		return _env('SESSION_DB_URL');
	};


/*********/
/* Tests */
/*********/

exports.validateEnviroment = function() 
	{
		exports.appSecret();
		exports.appID();

		exports.sessionSecret();
		exports.sessionDatabaseName();
		exports.sessionDatabaseURL();
	};
