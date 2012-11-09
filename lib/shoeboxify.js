
var assert = require('assert');

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


/***********/
/* Session */
/***********/

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


/***********************/
/* Amazon Web Services */
/***********************/

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
			object: function(){ return _env('S3_OBJECT_BUCKET');	}
		,	 cache: function(){ return _env('S3_CACHE_BUCKET');		}
		,	  test: function(){ return _env('S3_TEST_BUCKET');		}
		}
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


/************/
/* Database */
/************/

exports.dbServerHost = function() 
	{
		return _env('DB_SERVER_HOST');
	};

exports.dbServerPort = function() 
	{
		return Math.round( _env('DB_SERVER_PORT') );
	};

exports.dbServerUsername = function() 
	{
		return _env('DB_SERVER_USERNAME');
	};

exports.dbServerPassword = function() 
	{
		return _env('DB_SERVER_PASSWORD');
	};

exports.dbName = function() 
	{
		return _env('DB_NAME');
	};


/*****************/
/* AUX */
/*****************/

function _env(name)
{
	var result =  process.env[name];

	assert( (result && result.length > 4), 'Cannot find env[' + name + ']' );

	return result;
}

/*********/
/* Tests */
/*********/

exports.validateEnviroment = function() 
	{
		// App
		exports.appSecret();
		exports.appID();

		// AWS
		exports.s3.R.key();
		exports.s3.R.secret();

		exports.s3.RW.key();
		exports.s3.RW.secret();

		exports.s3.bucket.object();
		exports.s3.bucket.cache();
		exports.s3.bucket.test();
	
		// Session
		exports.sessionSecret();
		exports.sessionDatabaseName();
		exports.sessionDatabaseURL();

		// DB
		exports.dbServerHost();
		exports.dbServerPort();
		exports.dbServerUsername();
		exports.dbServerPassword();
		exports.dbName();

	};
