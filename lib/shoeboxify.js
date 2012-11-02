
/*
 * GET users listing.
 */


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
