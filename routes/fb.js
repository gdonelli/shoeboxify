
/*
 * Facebook
 */

var https = require('https');
var querystring = require('querystring');
var md5 = require('MD5');
var url = require('url');

var utils = require('../lib/utils-lib');

var secret = require('../secret/secret');

var facebookAuthInfo = 
	{
		 'appID'          : '299942050094388'
		,'appSecret'      : secret.appSecret()
		,'appPermissions' : 'email, user_photos, friends_photos'
	};

function DialogRedirectURL(req)
{
	var reqHeaders = req.headers;
	var reqHost    = reqHeaders.host;
	
	if (reqHost == "127.0.0.1:3000")
		return 'http://beta.shoeboxify.com/login-127001.php';
	else
		return 'http://shoeboxify.jit.su/facebook-response';
}

/* ================================ EXPORTS ==================================== */
/* ============================================================================= */


exports.requiresAuthentication = 
	function(req, res, next)
	{
		if (req.session.accessToken)
		{
			next();
		}
		else
		{
			var encodedURL = utils.ASCIItoBase64(req.url);

			res.redirect('/facebook-login?source=' + encodedURL);
		}
	}


exports.login = 
	function(req, res)
	{
		var urlElements = url.parse(req.url, true);
		var stateObject = { id: md5( Math.random() ) };
		
		if (urlElements['query'])
		{
			var sourceURL = urlElements['query']['source'];
			if (sourceURL && sourceURL.length > 1)
				stateObject['source'] = sourceURL;
		}

		var state = JSON.stringify(stateObject);

		var query = {
				'client_id'		: facebookAuthInfo['appID']
				, 'redirect_uri': DialogRedirectURL(req)
				, 'scope'		: facebookAuthInfo['appPermissions']
				, 'state'		: state
			};

		var fbAuthURL = 'https://www.facebook.com/dialog/oauth?' + querystring.stringify(query);

		res.redirect(fbAuthURL);
	};


function WriteObject(req, res)
{
	res.writeHead(200, {'Content-Type': 'text/html'});

	res.write('<html><body>');

	for(var aKey in req)
		if (req.hasOwnProperty(aKey))
  		{
			res.write( aKey + ": " + req[aKey] );
			res.write('<br>');
		}

	res.end('</body></html>');
}



/* ============================================================================= */
exports.response = 
	function(req, res)
	{
		var urlElements   = url.parse( req['url'], true );
		var queryElements = urlElements['query'];

		var code  = queryElements['code'];
		var error = queryElements['error'];

		var state = queryElements['state'];
		var source;

		if (state) {
			var stateObject = JSON.parse(state);
			var sourceInState = stateObject['source'];

			if (sourceInState)
				source = utils.Base64toASCII(sourceInState);
		}

		console.log('fb-response -> code: ' + code + ' state:' + state + ' error:' + error + ' source:' + source );
	
		//TODO: verify state to avoid cross site forgery

		if (error)
		{
			res.writeHead(200, {'Content-Type': 'text/html'});

			res.write('<html><body>');
			res.write('<h1>Facebook Login Failed (' + error +')</h1>');
			res.end('</body></html>');

		}
		if ( code && code.length > 1 ) //Exchange code for Access Token
		{
			AccessTokenFromCode(
				function consumeToken(token, expiration)
				{
					StartSession(
						token,
						expiration,
						function success() {
							if (source)
								res.redirect(source);
							else
							{
								res.writeHead(200, {'Content-Type': 'text/html'});

								res.write('<html><body>');

								res.write('<p><strong>accessToken: </strong>' + token + '</p>');
								res.write('<p><strong>expiresInSeconds: </strong>' + expiration + '</p>');
					
								res.write('<p><strong>source: </strong>' + source + '</p>');

								res.end('</body></html>');
							}
						},
						function failure(e) {
								res.writeHead(200, {'Content-Type': 'text/html'});

								res.write('<html><body>');
								res.write('<p>Session Start Failure</p>');
								res.end('</body></html>');
						} );

				}
				, function authError(errString)
				{
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write('<html><body>');

					res.write('<h1>Facebook Login Error</h1>');

					if (errString)
					{
						res.write('<p>' + errString + '</p>');
					}

					res.end('</body></html>');
				} );
		}


		/* ============================= */
		function AccessTokenFromCode(
									consumeTokenFunction /* (token, expiration) */
									, errorFunction /* errString */) 
		{
			console.log('AccessTokenFromCode: '+ code);

			var query = {
				'client_id'			: facebookAuthInfo['appID']
				, 'redirect_uri'	: DialogRedirectURL(req)
				, 'client_secret'	: facebookAuthInfo['appSecret']
				, 'code'			: code
			};

			var accessTokenURL ='https://graph.facebook.com/oauth/access_token?'+ querystring.stringify(query);

			var tokenReq = https.get( 
				accessTokenURL,
				
				function(tokenRes)
				{			
					var resBuffer = '';
	  				
	  				tokenRes.on('data',
	  					function (chunk) {
	    					resBuffer += chunk;
	  					} );

  					tokenRes.on('end',
						function () {
   	 						console.log(resBuffer);

							if (tokenRes.statusCode == 200)
							{
		    					var bufferElements = url.parse('?'+resBuffer, true);
	    						var accessToken      = bufferElements['query']['access_token'];
								var expiresInSeconds = bufferElements['query']['expires'];

								consumeTokenFunction(accessToken, expiresInSeconds);
							}
							else
							{
								console.error('tokenRes.statusCode: ' + tokenRes.statusCode);

								if (errorFunction)
									errorFunction(resBuffer);
							}
  						} );
				} );
			
			tokenReq.on('error',
				function(e) {
  					console.error(e);
  					if (errorFunction)
	  					errorFunction('AccessTokenFromCode -> tokenReq.on(error):' + e + ' for URL: ' + accessTokenURL);
				} );
		
			tokenReq.end();
		}

		/* ============================= */
		function StartSession(accessToken, expiresInSeconds, nextFunction, errorFunction)
		{
			req.session.accessToken = accessToken;

			// Store me information in the Session
			exports.graph('me', req,
				function(fbObject)
				{
					var meKeys = ['id', 'name', 'first_name', 'last_name', 'link', 'username', 'gender', 'email', 'timezone', 'locale', 'updated_time'];

					var meInfo = DictionaryWithOnlyKeys(fbObject, meKeys);

					req.session.me = meInfo;

					if (nextFunction)
						nextFunction();
				},
				function(error)
				{
					if (errorFunction)
						errorFunction();
				} );

		}

	};

function DictionaryWithOnlyKeys(sourceDictionary, keyArray)
{
	var result = {};

	for (var aKeyIndex in keyArray)
	{
		var aKey = keyArray[aKeyIndex];

		if (sourceDictionary.hasOwnProperty(aKey))
		{
			result[aKey] = sourceDictionary[aKey];
		}
	}

	return result;
}


exports.graph = 
	function(path, req, consumeFunction /*(fbObject)*/, errorFunction /* (error) */)
	{
		var url;

		if (path.startsWith('http'))
			url = path;
		else
		{
			url = 'https://graph.facebook.com/' + path;
			
			if ( path.indexOf('?') >=0 )
				url += '&';
			else				
				url += '?';

			url +=  'access_token='+req.session.accessToken;
		}


		console.log('GRAPH API: ' + url);

		https.get( url,
			function(graphRes) {
				var bufferString = '';

				graphRes.on('data',
					function (chunk) {
						bufferString += chunk;
					} );

				graphRes.on('end',
					function () {
						if (consumeFunction)
							consumeFunction( JSON.parse(bufferString) );
					} );
			} )
		.on('error', 
			function(e)
			{
				console.error('GET Failed: ' + url + " err:" + e);

				if (errorFunction)
					errorFunction(e);
			}

		);

	}


exports.batch =
	function( paths, req, consumeFunction /*(fbObject)*/, errorFunction /* (error) */)
	{
		var options = {
			host: 'graph.facebook.com'
			, method: 'POST'
		};

		var batchAPI = [];

		for (var i in paths)
			batchAPI.push( { "method":"GET", "relative_url":paths[i] } );

		var request = https.request(options,
			function (response)
			{
				var str = '';
				response.on('data',
					function (chunk) {
						str += chunk;
					} );

				response.on('end',
					function () {
		    			if (consumeFunction)
							consumeFunction( JSON.parse(str) );
					} );
			});

		// the data to POST needs to be a string or a buffer
		request.write( 'access_token=' + req.session.accessToken );
		request.write( '&' );
		request.write( 'batch=' + JSON.stringify(batchAPI) ) ;
		
		request.end();
	}


