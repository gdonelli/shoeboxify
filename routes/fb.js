
/*
 * Facebook
 */




var 	https		= require('https')
	,	querystring	= require('querystring')
	,	md5			= require('MD5')
	,	url			= require('url')

	/* libs */

	,	utils		= require('../lib/utils-lib')
	,	shoeboxify	= require('../lib/shoeboxify')
	;



/* ================================ EXPORTS ==================================== */
/* ============================================================================= */


exports.requiresAuthentication = 
	function(req, res, next)
	{
		if ( req.session.hasOwnProperty('accessToken') )
		{
			next();
		}
		else
		{
			var encodedURL = utils.ASCIItoBase64(req.url);

			 res.redirect( shoeboxify.facebookLoginPath() + '?source=' + encodedURL);		
		}			
	}


exports.isAuthenticated = 
	function(req)
	{
		return req.session.hasOwnProperty('accessToken');
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

		req.session.loginState = state;

		var query = {
				  'client_id'		: shoeboxify.appID()
				, 'redirect_uri'	: shoeboxify.dialogRedirectURL(req)
				, 'scope'			: shoeboxify.appPermissions()
				, 'state'			: state
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


		if (error)
		{
			RespondWithError('Login Error', error);
		}
		else if ( code && code.length > 1 ) //Exchange code for Access Token
		{
			AccessTokenFromCode(
				function ConsumeToken(token, expiration)
				{
					StartSession( token, expiration,
						function success() {
							if (source)
								res.redirect(source);
							else
							{
								RespondWithLoginSuccess();
							}
						},
						function failure(e) {
								var errorToReport = 'error:' + e;
								errorToReport += ', Token:' + token;
								errorToReport += ', Expiration:' + expiration;

								RespondWithError( 'StartSession() failed', errorToReport );
						} );

				}
				, function AccessTokenError(errString)
				{
					RespondWithError( 'AccessTokenFromCode() failed', errString );
				} );
		}


		/* ============================= */

		function RespondWithLoginSuccess()
		{
			var title = req.session.me.name +' - Login Successful';

			res.writeHead(200, {'Content-Type': 'text/html'});

			res.write('<html>');

			res.write('<head>');
			res.write('<title>' + title + '</title>');
			res.write('</head>');

			res.write('<body>');
			res.write('<h1>' + title + '</h1>');

			res.write('<p><strong>accessToken: </strong>' + _accessToken(req) + '</p>');
			res.write('<p><strong>expires: </strong>' + _expiresToken(req) + ' seconds (' + _expiresToken(req)/(60*60*24) + ' days)</p>');

			res.write('</body>');
			
			res.end('</html>');
		}

		
		function RespondWithError(title, e)
		{
			shoeboxify.error('Login: ' + e);

			res.writeHead(200, {'Content-Type': 'text/html'});

			res.write('<html>');

			res.write('<head>');
			res.write('<title>' + title + '</title>');
			res.write('</head>');

			res.write('<body>');
			res.write('<h1>' + title + '</h1>');
			res.write('<p> Error: ' + e +'</p><br>');
			res.write('<p style="color:red">Please report this error at error[at]shoeboxify.com</p>');
			res.write('</body>');
			
			res.end('</html>');
		}

		function AccessTokenFromCode( consumeTokenFunction /* (token, expiration) */ 
									, errorFunction /* errString */) 
		{
			console.log('AccessTokenFromCode: '+ code);

			var query = {
				  'code'			: code
				, 'client_id'		: shoeboxify.appID()
				, 'client_secret'	: shoeboxify.appSecret()
				, 'redirect_uri'	: shoeboxify.dialogRedirectURL(req)
				
			};

			var accessTokenPath ='/oauth/access_token?'+ querystring.stringify(query);

			var tokenOptions = {
					method:		'GET'
				,	hostname:	'graph.facebook.com'
				,	path:		accessTokenPath
			}

			var tokenReq = https.request( 
				tokenOptions,
				
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

								if ( !accessToken || !expiresInSeconds )
								{
									if (errorFunction)
										errorFunction( 'accessToken:' + accessToken +' expiresInSeconds:' + expiresInSeconds);
								}
									
								consumeTokenFunction(accessToken, expiresInSeconds);
							}
							else
							{
								console.error('tokenRes.statusCode: ' + tokenRes.statusCode);

								if (errorFunction)
									errorFunction('tokenRes.statusCode: ' + tokenRes.statusCode + ' resBuffer:' + resBuffer);
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
			 _setAccessToken(req, accessToken, expiresInSeconds ); 
			req.session.cookie.maxAge = Math.floor(expiresInSeconds) * 1000; 

			// Store me information in the Session
			exports.graph('me', req,
				function(fbObject)
				{
					var meKeys = ['id', 'name', 'first_name', 'last_name', 'link', 'username', 'gender', 'email', 'timezone', 'locale', 'updated_time'];

					var meInfo = DictionaryWithOnlyKeys(fbObject, meKeys);

					req.session.regenerate(
						function (err) {
							_setAccessToken(req, accessToken, expiresInSeconds ); 
							req.session.cookie.maxAge = Math.floor(expiresInSeconds) * 1000;
							req.session.me = meInfo;

							if (nextFunction)
								nextFunction();
						});
				

				},
				function(error)
				{
					if (errorFunction)
						errorFunction(error);
				} );

		}

	};

function _accessToken(req)
{
	return req.session.accessToken;	
}

function _expiresToken(req)
{
	return req.session.expiresToken;	
}


function _setAccessToken(req, token, expires )
{
	req.session.accessToken = token;
	req.session.expiresToken = expires;
}

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
	function( path, srcReq, consumeFunction /*(fbObject)*/, errorFunction /* (error) */)
	{
		shoeboxify.debug('GRAPH: ' + path );

		var reqOptions = { method: 'GET' };

		// This is full URL graph request
		if (path.startsWith('http'))
		{
			var urlElements = url.parse(path);

			reqOptions['hostname']	= urlElements['hostname'];
			reqOptions['path']		= urlElements['path'];
		}
		else
		{
			// if there is no leading / we will add it
			var reqPath = ( path.startsWith('/') ? '' : '/');
			reqPath += path;
			reqPath += (path.indexOf('?') < 0 ? '?' : '&');
			reqPath += 'access_token='+ _accessToken(srcReq);

			reqOptions['hostname']	= 'graph.facebook.com';
			reqOptions['path']		= reqPath;
		}

		// shoeboxify.debug('reqOptions: ' + JSON.stringify(reqOptions) );

		var apiReq = https.request( reqOptions, _processGraphResponse );

		_setupErrorHander(apiReq);

		apiReq.end();


		
 		/* ============================== */

		function _setupErrorHander(apiReq)
		{
			apiReq.on('error', 
				function(e)
				{
					shoeboxify.error('**** ERROR: Graph Request Failed for path: ' + path + " err:" + e);

					if (errorFunction)
						errorFunction(e);
				});			
		}

		function _processGraphResponse(apiReq)
		{
			var bufferString = '';

			apiReq.on('data',
				function (chunk) {
					bufferString += chunk;
				} );

			apiReq.on('end',
				function () {
					try
					{
						var jsonObject = JSON.parse(bufferString);
						if (consumeFunction)
							consumeFunction(jsonObject);						
					}
					catch(e)
					{
						console.error('Failed to process graph response:' + bufferString);

						if (errorFunction)
							errorFunction(e);
					}
				} );
		}

	}


exports.batch =
	function( paths, req, consumeFunction/* (fbObject) */, errorFunction/* (error) */)
	{
		var options = {
				host:		'graph.facebook.com'
			,	method:		'POST'
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
		request.write( 'access_token=' + _accessToken(req) );
		request.write( '&' );
		request.write( 'batch=' + JSON.stringify(batchAPI) ) ;
		
		request.end();
	}


//
// Example:
//		http://shoeboxify.jit.su/o4u?u=something_base64
//

function _extractFacebookObjectID( srcString )
{
	if (srcString.startsWith('http'))
	{
		// https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf

		if (srcString.indexOf('photo.php?') > 0 && srcString.indexOf('fbid=') > 0 )
		{
			var stringElements = url.parse(srcString, true);
			var stringQuery = stringElements['query'];
			var fbid = stringQuery['fbid'];

			return fbid;
		}

		// https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg
		
		var last4chars = srcString.substring((srcString.length-4), srcString.length );

		if ( last4chars == '.jpg')
		{
			var srcStringSpliyElements = srcString.split('/');

			var lastPathComponent = srcStringSpliyElements[srcStringSpliyElements.length-1];

			var numbers = lastPathComponent.split('_');

			var canditateResult = numbers[1];

			var isnum = /^\d+$/.test(canditateResult);

			if (isnum)
				return canditateResult;
		}
	}

	return undefined;
}


/*  === objectForURL ===
 *
 * 	returns json:
 *		{
 *			status:	  0 : success
 *					  1 : malformed request
 *					  2 : Failed to look up Facebook Object
 *					403 : User not logged-in in Shoeboxify
 *		}
 *   
 * 
 */

exports.objectForURL = 
	function(req, res)
	{
		var urlElements = url.parse(req.url, true);
		var urlQuery = urlElements['query'];

		res.writeHead(200, { 'Content-Type': 'application/json' } );

		shoeboxify.debug(req.url);

		var jsonResult;

		if ( !urlQuery || urlQuery['u'].length <= 0 )
		{
			ExitWithResult({
					status: 1
				,   source: sourceURI
				,	  error: 'malformed request ?u= is empty' 
			} );

			shoeboxify.error('urlQuery is malformed');
		}
		else if ( !exports.isAuthenticated(req) )
		{
			ExitWithResult({
					status: 403
				,   source: sourceURI
				,	  error: 'User not logged-in in Shoeboxify' 
			} );

		}
		else
		{
			shoeboxify.log(urlQuery);
			
			var sourceURI = urlQuery['u'];
			var fbID =  _extractFacebookObjectID(sourceURI);

			if (fbID)
			{
				exports.graph( fbID, req,
					function success(fbObject)
					{
						ExitWithResult(	{
								status: 0
							,   source: sourceURI
							,     data: fbID
							, graphObject: fbObject
							} );
					},
					function error(error)
					{
						ExitWithResult(	{
								status: 2
							,   source: sourceURI
							,    error: 'Failed to lookup: ' + fbID + ' error:' + error
							} );

					} );
			}
			else
			{
				ExitWithResult({
						status: 2
					,	source: sourceURI
					,	 error: 'Cannot find object id for source'
							} );				
			}
		}

		function ExitWithResult(result)
		{
			res.end( JSON.stringify(result) );
		}
		
	}

