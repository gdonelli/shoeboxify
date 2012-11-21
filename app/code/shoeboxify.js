
var assert = require('assert');

var shoeboxify = exports;

/**********************/
/* Facebook App Stuff */
/**********************/

shoeboxify.appID = function() {
		return _env('APP_ID');
	};

shoeboxify.appSecret = function() {
		return _env('APP_SECRET');
	};

shoeboxify.appPermissions = function() {
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

shoeboxify.dialogRedirectURL = function(req) {
		var reqHeaders = req.headers;
		var reqHost    = reqHeaders.host;
		
		return 'http://' + reqHost + '/facebook-response';
	}


/***********/
/* Session */
/***********/

shoeboxify.sessionSecret = function() 
	{
		return _env('SESSION_SECRET');
	};

shoeboxify.sessionDatabaseName = function() 
	{
		return _env('SESSION_DB_NAME');
	};

shoeboxify.sessionDatabaseURL = function() 
	{
		return _env('SESSION_DB_URL');
	};

shoeboxify.adminID = function() {
		return _env('ADMIN_ID');
	};

/***********************/
/* Amazon Web Services */
/***********************/

shoeboxify.s3 = {
		key: {
				R:	function(){ return _env('S3_R_KEY');	}
			,	RW:	function(){ return _env('S3_RW_KEY');	}
		}

	,	secret: {
				R:	function(){ return _env('S3_R_SECRET');	}
			,	RW:	function(){ return _env('S3_RW_SECRET');}
		}
	};



/***********/
/* Logging */
/***********/

shoeboxify.log  = function(string) {
		console.log(string);
	};

shoeboxify.debug  = function(string) {
		console.log(string);
	};

shoeboxify.error  = function(string) {
		console.error( '***** ERROR: ' + string);
	};


/************/
/* Database */
/************/

shoeboxify.dbServerHost = function() 
	{
		return _env('DB_SERVER_HOST');
	};

shoeboxify.dbServerPort = function() 
	{
		return Math.round( _env('DB_SERVER_PORT') );
	};

shoeboxify.dbServerUsername = function() 
	{
		return _env('DB_SERVER_USERNAME');
	};

shoeboxify.dbServerPassword = function() 
	{
		return _env('DB_SERVER_PASSWORD');
	};

shoeboxify.dbName = function() 
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

shoeboxify.validateEnviroment = function() 
	{
		// App
		shoeboxify.appSecret();
		shoeboxify.appID();

		// AWS
		shoeboxify.s3.key.R();
		shoeboxify.s3.key.RW();
		shoeboxify.s3.secret.R();
		shoeboxify.s3.secret.RW();

		// Session
		shoeboxify.sessionSecret();
		shoeboxify.sessionDatabaseName();
		shoeboxify.sessionDatabaseURL();

		// DB
		shoeboxify.dbServerHost();
		shoeboxify.dbServerPort();
		shoeboxify.dbServerUsername();
		shoeboxify.dbServerPassword();
		shoeboxify.dbName();
	};
