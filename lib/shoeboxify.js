
/*
 * GET users listing.
 */

var	secret = require('../secret/secret')

/**********************/
/* Facebook App Stuff */
/**********************/

exports.appID = function() {
		return '299942050094388';
	};

exports.appSecret = function() {
		return secret.appSecret();
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

/*****************/
/* Miscellaneous */
/*****************/

exports.cookieParserHashString = function() {
		return 'com.shoeboxify.secret.for.hashing.session.data';
	};


