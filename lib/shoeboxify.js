
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
		return 'email, user_photos, friends_photos';
	};

exports.dialogRedirectURL = function(req) {
		var reqHeaders = req.headers;
		var reqHost    = reqHeaders.host;
		
		if (reqHost == "127.0.0.1:3000")
			return 'http://beta.shoeboxify.com/login-127001.php';
		else
			return 'http://shoeboxify.jit.su/facebook-response';
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


exports.validateEnviroment = function() 
	{
		exports.appSecret();
		exports.appID();

		exports.sessionSecret();
		exports.sessionDatabaseName();
		exports.sessionDatabaseURL();
	};
