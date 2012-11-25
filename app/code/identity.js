/*

========[   App identity properties and secrets   ]========

Facebook App:
			identity.appID 
			identity.appSecret
			identity.appPermissions
Session:
			identity.sessionSecret
			identity.sessionDatabaseName
			identity.sessionDatabaseURL
S3:
			identity.s3.host
			identity.s3.user.R.key 
			identity.s3.user.R.secret
			identity.s3.user.RW.key
			identity.s3.user.RW.secret
			identity.s3.bucket.test
			identity.s3.bucket.production
Mongo:
			identity.dbServerHost
			identity.dbServerPort
			identity.dbServerUsername
			identity.dbServerPassword
			identity.dbName
Email:
			identity.emailAddress
			identity.SMTPUser
			identity.SMTPPassword
			identity.SMTPHost
Other:
			identity.adminID

===========================================================

*/

var 	assert	= require('assert')
	,	_ 		= require('underscore');


var identity = exports;


/* ===================================================== */
/* ===================================================== */
/* =====================  Facebook ===================== */
/* ===================================================== */
/* ===================================================== */

identity.appID = 
	function()	{	return _env('APP_ID');	};

identity.appSecret = 
	function()	{	return _env('APP_SECRET');	};

identity.appPermissions =
	function() {
		var result = '';

		// For email notifications
		result += 'email, '; 

		// Obviously this is what identity is about
		result += 'user_photos, friends_photos, ';

		// More subtle: some photos are posted as 
		// status updates and we need this permission to access it
		result += 'user_status, friends_status, ';

		return result;
	};


/* ===================================================== */
/* ===================================================== */
/* =====================  Session  ===================== */
/* ===================================================== */
/* ===================================================== */

identity.sessionSecret = 
	function()	{	return _env('SESSION_SECRET');	};

identity.sessionDatabaseName =
 	function()	{	return _env('SESSION_DB_NAME');	};

identity.sessionDatabaseURL = 	
	function()	{	return _env('SESSION_DB_URL');	};


/* ===================================================== */
/* ===================================================== */
/* =====================    S3    ====================== */
/* ===================================================== */
/* ===================================================== */

identity.s3			= { user: { R:{}, RW:{} }, bucket: {} };

identity.s3.host =
	function(){ return _env('S3_HOST_NAME');	};

identity.s3.user.R.key =
	function(){ return _env('S3_R_KEY');	};

identity.s3.user.R.secret =
	function(){ return _env('S3_R_SECRET');	};

identity.s3.user.RW.key =
	function(){ return _env('S3_RW_KEY');	};

identity.s3.user.RW.secret =
	function(){ return _env('S3_RW_SECRET');	};

identity.s3.bucket.test =
	function(){ return _env('S3_TEST_BUCKET');	};

identity.s3.bucket.production =
	function(){ return _env('S3_PRODUCTION_BUCKET');	};


/* ===================================================== */
/* ===================================================== */
/* ====================    Mongo    ==================== */
/* ===================================================== */
/* ===================================================== */

identity.dbServerHost = 
	function()	{	return _env('DB_SERVER_HOST');	};

identity.dbServerPort = 
	function()	{	return Math.round( _env('DB_SERVER_PORT') );	};

identity.dbServerUsername = 
	function()	{	return _env('DB_SERVER_USERNAME');	};

identity.dbServerPassword =
	function()	{	return _env('DB_SERVER_PASSWORD');	};

identity.dbName =
	function()	{	return _env('DB_NAME');	};


/* ===================================================== */
/* ===================================================== */
/* ====================    e-mail   ==================== */
/* ===================================================== */
/* ===================================================== */

identity.emailAddress = 
	function()	{	return _env('EMAIL_ADDRESS');	};

identity.SMTPUser =
	function()	{	return _env('SMTP_USER');	};

identity.SMTPPassword = 
	function()	{	return _env('SMTP_PASSWORD');	};

identity.SMTPHost =
	function()	{	return _env('SMTP_HOST');	};


/* ===================================================== */
/* ===================================================== */
/* ====================    Other    ==================== */
/* ===================================================== */
/* ===================================================== */

identity.adminID =
	function() {	return _env('ADMIN_ID');	};


/* ===================================================== */


function _env(name)
{
	var result =  process.env[name];

	assert( (result && result.length > 4), 'Cannot find env[' + name + ']' );

	return result;
}

identity.validateEnviroment = function() 
	{
		var properties = [
				'appID'
			,	'appSecret'
			,	'appPermissions'

			,	'sessionSecret'
			,	'sessionDatabaseName'
			,	'sessionDatabaseURL'

			,	'dbServerHost'
			,	'dbServerPort'
			,	'dbServerUsername'
			,	'dbServerPassword'
			,	'dbName'

			,	'emailAddress'
			,	'SMTPUser'
			,	'SMTPPassword'
			,	'SMTPHost'

			,	'adminID'
		]

		for (var i in properties)
		{
			var propertyKey = properties[i];
			var value = identity[propertyKey]();
			_validate(value);
		}

		_callAllFunctionsNestedInObject( identity.s3 );


		// ================================================================

		function _validate(value)
		{	
			// console.log('validate: ' + value);
			assert( value != undefined, 'identity property is undefined' );
			
			if ( _.isString(value) )
				assert( value.length > 3, 'property doesnt look valid, it is: ' + value );			
		}

		function _callAllFunctionsNestedInObject(o)
		{
			for (var key in o)
			{
				// console.log(key);

				var valueForKey = o[key];

				if ( _.isFunction(valueForKey) )
				{
					_validate( valueForKey() );
				}
				else if ( _.isObject(valueForKey) )
				{
					_callAllFunctionsNestedInObject(valueForKey);
				}
				else
					console.error('dont know what to do with key: ' + key + 'value: ' + valueForKey);
			}
		}
	};
