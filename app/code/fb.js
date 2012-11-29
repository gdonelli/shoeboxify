/* 

==================[   Facebook   ]==================

Routes:
			fb.route.login			(fb.path.login)
			fb.route.loginResponse	(fb.path.loginResponse)
			fb.route.logout			(fb.path.logout)
			fb.route.uninstall		(fb.path.uninstall)

Middleware:
			fb.requiresAuthentication
			fb.requiresAdmin
			fb.redirectToAuthentication
			fb.sanitizeObject

User
			fb.me		get /me object from session
			fb.isAuthenticated
			fb.getAccessToken
			fb.getExpiresToken

Query
			fb.graph	Facebook Graph API
			fb.batch	Batch Graph API requests
			
====================================================


*/

var 	https		= require('https')
	,	querystring	= require('querystring')
	,	md5			= require('MD5')
	,	url			= require('url')
	,	assert		= require('assert')

	/* libs */

	,	handy		= require('./handy')
	,	mongo		= require('./mongo')
	,	identity	= require('./identity')
	,	stacktrace	= require('./stacktrace')
	;

fb = exports;

fb.route = {};
fb.path	 = {};


/* ======================================================== */
/* ======================================================== */
/* ======================== Routes ======================== */
/* ======================================================== */
/* ======================================================== */

function _dialogRedirectURL(req)
{
	var reqHeaders = req.headers;
	var reqHost    = reqHeaders.host;
	
	return 'http://' + reqHost + fb.path.loginResponse;
}


/*	PAGE:	Start Facebook Login	
 * 	URL:	/login
 */ 

fb.path.login = '/login';

fb.route.login = 
	function(quest, ponse)
	{
		var urlElements = url.parse(quest.url, true);
		var stateObject = { id: md5( Math.random() ) };
		
		if (urlElements['query'])
		{
			var sourceURL = urlElements['query']['source'];
			if (sourceURL && sourceURL.length > 1)
				stateObject['source'] = sourceURL;
		}

		var state = JSON.stringify(stateObject);

		quest.session.loginState = state;

		var query = {
				  'client_id'		: identity.appID()
				, 'redirect_uri'	: _dialogRedirectURL(quest)
				, 'scope'			: identity.appPermissions()
				, 'state'			: state
			};

		var fbAuthURL = 'https://www.facebook.com/dialog/oauth?' + querystring.stringify(query);

		ponse.redirect(fbAuthURL);
	};

/*	PAGE:	Facebook Authentication Callback Page
 * 	URL:	/login-response
 */

fb.path.loginResponse = '/fb/login-response';

fb.route.loginResponse = 
	function(quest, ponse)
	{
		var urlElements   = url.parse( quest['url'], true );
		var queryElements = urlElements['query'];

		var code  = queryElements['code'];
		var error = queryElements['error'];

		var state = queryElements['state'];
		var source;

		if (state) {
			var stateObject = JSON.parse(state);
			var sourceInState = stateObject['source'];

			if (sourceInState)
				source = handy.Base64toASCII(sourceInState);
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
						StartSession( token, expiration
								,	function success()
									{
										try
										{
											UserSessionStartedSuccesfully();
										}
										catch(e)
										{
											RespondWithError('UserSessionStartedSuccesfully failed ', e);
										}
									}
								,	function failure(e)
									{
										var errorToReport = 'error:' + e;
										errorToReport += ', Token:' + token;
										errorToReport += ', Expiration:' + expiration;

										RespondWithError( 'StartSession() failed', errorToReport );
									} );
					}
				,	function AccessTokenError(errString)
					{
						RespondWithError( 'AccessTokenFromCode() failed', errString );
					} );
		}


		/* =============================================================================== */
		

		function AccessTokenFromCode( consumeTokenFunction /* (token, expiration) */ 
									, error_f /* errString */) 
		{
			console.log('AccessTokenFromCode: '+ code);

			var query = {
				  'code'			: code
				, 'client_id'		: identity.appID()
				, 'client_secret'	: identity.appSecret()
				, 'redirect_uri'	: _dialogRedirectURL(quest)
				
			};

			var accessTokenPath ='/oauth/access_token?'+ querystring.stringify(query);

			var tokenOptions = {
					method:		'GET'
				,	hostname:	'graph.facebook.com'
				,	path:		accessTokenPath
			}

			var tokenQuest = https.request( 
				tokenOptions,
				
				function(tokenPonse)
				{			
					var resBuffer = '';
	  				
	  				tokenPonse.on('data',
	  					function (chunk) {
	    					resBuffer += chunk;
	  					} );

  					tokenPonse.on('end',
						function () {
   	 						console.log(resBuffer);

							if (tokenPonse.statusCode == 200)
							{
		    					var bufferElements = url.parse('?'+resBuffer, true);
	    						var accessToken      = bufferElements['query']['access_token'];
								var expiresInSeconds = bufferElements['query']['expires'];

								if ( !accessToken || !expiresInSeconds )
								{
									if (error_f)
										error_f( 'accessToken:' + accessToken +' expiresInSeconds:' + expiresInSeconds);
								}
									
								consumeTokenFunction(accessToken, expiresInSeconds);
							}
							else
							{
								console.error('tokenPonse.statusCode: ' + tokenPonse.statusCode);

								if (error_f)
									error_f('tokenPonse.statusCode: ' + tokenPonse.statusCode + ' resBuffer:' + resBuffer);
							}
  						} );
				} );
			
			tokenQuest.on('error',
				function(e) {
  					console.error(e);
  					if (error_f)
	  					error_f('AccessTokenFromCode -> tokenQuest.on(error):' + e + ' for URL: ' + accessTokenURL);
				} );

			tokenQuest.end();
		}

		function StartSession(accessToken, expiresInSeconds, nextFunction, error_f)
		{
			 _setAccessToken(quest, accessToken, expiresInSeconds ); 
			quest.session.cookie.maxAge = Math.floor(expiresInSeconds) * 1000; 

			// Store me information in the Session
			fb.graph('me', quest,
				function(fbObject)
				{
					var meKeys = ['id', 'name', 'first_name', 'last_name', 'link', 'username', 'gender', 'email', 'timezone', 'locale', 'updated_time'];

					var meInfo = _dictionaryWithOnlyKeys(fbObject, meKeys);

					quest.session.regenerate(
						function (err) {
							_setAccessToken(quest, accessToken, expiresInSeconds ); 
							quest.session.cookie.maxAge = Math.floor(expiresInSeconds) * 1000;
							quest.session.me = meInfo;

							if (nextFunction)
								nextFunction();
						});
				

				},
				function(error)
				{
					if (error_f)
						error_f(error);
				} );
		}

		function UserSessionStartedSuccesfully()
		{
			assert(quest != undefined,			'quest is undefined');
			assert(quest.session != undefined,	'quest.session is undefined');
			assert(quest.session.me != undefined,	'quest.session.me is undefined');
			assert(quest.session.me.id != undefined,'quest.session.me.id is undefined');

			// init user mongo db
			mongo.memento.init(
					quest.session.me.id
				,	function success(collection) {
						assert(collection != undefined, 'user collection is undefined');
						LastStep();
					}
				,	function error(e) {
						RespondWithError('mongo.user.init failed', e);
					} );

		}

		function LastStep()
		{
			if (source)
				ponse.redirect(source);
			else
				RespondWithLoginSuccess();			
		}

		function IsShoeboxifyTool()
		{
			return (quest.headers['user-agent'] == 'com.shoeboxify.tool');
		}

		function RespondWithLoginSuccess()
		{
			if ( IsShoeboxifyTool() )
				return RespondWithJSONSuccess();
			else
				return RespondWithHTMLSuccess();
		}

		function RespondWithJSONSuccess()
		{
			ponse.writeHead( 200, { 'Content-Type': 'application/json' } );
			
			var object = {	'accessToken'	: fb.getAccessToken(quest),
							'expires'		: fb.getExpiresToken(quest)	};

			ponse.end( JSON.stringify(object) );	
		}
		
		function RespondWithHTMLSuccess()
		{
			var title = quest.session.me.name +' - Login Successful';

			ponse.writeHead(200, {'Content-Type': 'text/html'});

			ponse.write('<html>');

			ponse.write('<head>');
			ponse.write('<title>' + title + '</title>');
			ponse.write('</head>');

			ponse.write('<body>');
			ponse.write('<h1>' + title + '</h1>');

			ponse.write('<p><strong>accessToken: </strong>' + fb.getAccessToken(quest) + '</p>');
			ponse.write('<p><strong>expires: </strong>' + fb.getExpiresToken(quest) + ' seconds (' + fb.getExpiresToken(quest)/(60*60*24) + ' days)</p>');

			ponse.write('</body>');
			
			ponse.end('</html>');			
		}

		function RespondWithError(title, e)
		{
			if ( IsShoeboxifyTool() )
				return RespondWithJSONError(title, e);
			else
				return RespondWithHTMLError(title, e);
		}
		
		function RespondWithJSONError(title, e)
		{
			console.error('Login: ' + e);

			ponse.writeHead( 200, { 'Content-Type': 'application/json' } );

			var responseObject = {};

			responseObject.message = title;
			responseObject.error = e.message;
			responseObject.trace = handy.errorLogStacktrace(e);
			
			ponse.end( JSON.stringify(responseObject) );
		}

		function RespondWithHTMLError(title, e)
		{
			console.error('Login: ' + e);

			ponse.writeHead(200, {'Content-Type': 'text/html'});

			ponse.write('<html>');

			ponse.write('<head>');
			ponse.write('<title>' + title + '</title>');
			ponse.write('</head>');

			ponse.write('<body>');
			ponse.write('<h1>' + title + '</h1>');
			ponse.write('<p>Error: ' + e +'</p><br>');


			// Trace

			ponse.write('<p>Trace:</p>');
			ponse.write('<code>');
			handy.writeHTMLstacktrace(ponse, e);
			ponse.write('</code>');
			

			ponse.write('<p style="color:red">Please report this error at error[at]shoeboxify.com</p>');
			ponse.write('</body>');
			
			ponse.end('</html>');
		}

	};

function _dictionaryWithOnlyKeys(sourceDictionary, keyArray)
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


/*
 *	Route:	Facebook App Logout
 *			Removes user session data
 */ 

fb.path.logout = '/logout';

fb.route.logout = 
	function(quest, ponse)
	{
		quest.session.destroy();

		_returnResponseWithMessage(ponse, 'logout');
	}

/*
 *	Route:	Facebook App Uninstall
 *			Uninstall facebook app and remove user session 		
 */ 

fb.path.uninstall = '/uninstall';

fb.route.uninstall = 
	function(quest, ponse)
	{
		if (!fb.isAuthenticated(quest))
			return _returnResponseWithMessage(ponse, 'User is not logged-in. I cannot do anything.');

		_graphCall(	'DELETE', '/me/permissions', quest
			,	function success(fbObject)
				{
					console.log('Delete success: ');
					console.log(fbObject);

					if (fbObject == true)
						_returnResponseWithMessage(ponse, 'Uninstall OK');
					else
						_returnResponseWithMessage(ponse, 'Uninstall failed: ' + JSON.stringify(fbObject) );

				}
			,	function error(e) 
				{	
					console.log('Delete error: ');
					console.log(e);

					_returnResponseWithMessage(ponse, 'Uninstall Error');
				});

		quest.session.destroy();
	}

function _returnResponseWithMessage(ponse, message)
{
	ponse.writeHead(200, {'Content-Type': 'text/html'});
	ponse.write('<html><body>');
	
	ponse.write('<p>' + message + '</p>');

	ponse.end('</body></html>');
}


/* ======================================================== */
/* ======================================================== */
/* ====================== Middleware ====================== */
/* ======================================================== */
/* ======================================================== */


fb.requiresAuthentication = 
	function(quest, ponse, next)
	{
		if ( quest.session.hasOwnProperty('accessToken') )
		{
			next();
		}
		else
		{
			fb.redirectToAuthentication(quest, ponse);
		}
	}


fb.requiresAdmin = 
	function(quest, ponse, next)
	{
		if ( fb.me(quest, 'id') == identity.adminID() )
		{
			next();
		}
		else
		{
			ponse.writeHead(403, {'Content-Type': 'text/html'});
			ponse.write('<html><body>');
		
			ponse.write('<h1>Requires Admin Priviledges</h1>');
			ponse.write('</body></html>');
			ponse.end();

		}
	}


fb.redirectToAuthentication =
	function(quest, ponse)
	{
		var encodedURL = handy.ASCIItoBase64(quest.url);
		var redirectURL = fb.path.login + '?source=' + encodedURL;

		ponse.redirect(redirectURL);

		console.log('AUTH-Redirect: ' + redirectURL);
	}


fb.sanitizeObject = 
	function(quest, ponse, object)
	{
		if (!object) 
		{
			return RespondWithErrorPage('facebook object is undefined');
		}

		var graphError = object['error'];

		if (graphError)
		{
			var type = graphError['type'];

			if (type == 'OAuthException')
			{
				fb.redirectToAuthentication(quest, ponse);
				return false;
			}
		}
		
		return true;

		function RespondWithErrorPage(error)
		{
			ponse.writeHead(200, {'Content-Type': 'text/html'} );
			ponse.write('<html><body>');
			ponse.write(error);
			ponse.end('</body></html>');
			return false;
		}
	}


/* ======================================================== */
/* ======================================================== */
/* ======================== User ========================== */
/* ======================================================== */
/* ======================================================== */


fb.me = function(quest, field)
	{
		assert(quest != undefined,				arguments.callee.name + ' quest is undefined');
		assert(quest.session != undefined,		arguments.callee.name + ' quest.session is undefined');
		assert(quest.session.me != undefined,	arguments.callee.name + ' quest.session.me is undefined');

		if (field) {
			assert(quest.session.me[field] != undefined, arguments.callee.name +' quest.session.me[field] is undefined');			
			return quest.session.me[field];
		}
		else
		{
			return quest.session.me;
		}
	}


fb.isAuthenticated = 
	function(quest)
	{
		return quest.session.hasOwnProperty('accessToken');
	}


fb.getAccessToken = 
	function(quest)
	{
		return quest.session.accessToken;
	}


fb.getExpiresToken = 
	function(quest)
	{
		return quest.session.expiresToken;
	}


function _setAccessToken(quest, token, expires )
{
	quest.session.accessToken = token;
	quest.session.expiresToken = expires;
}


/* ======================================================== */
/* ======================================================== */
/* ======================== Query ========================= */
/* ======================================================== */
/* ======================================================== */


function _graphCall(method, path, srcQuest, success_f /*(fbObject)*/, error_f /* (error) */)
{
	// console.log(method + ' GRAPH: ' + path);

	var questOptions = { method: method };

	// This is full URL graph request
	if (path.startsWith('http'))
	{
		var urlElements = url.parse(path);

		questOptions['hostname']	= urlElements['hostname'];
		questOptions['path']		= urlElements['path'];
	}
	else
	{
		// if there is no leading / we will add it
		var questPath = ( path.startsWith('/') ? '' : '/');
		questPath += path;
		questPath += (path.indexOf('?') < 0 ? '?' : '&');
		questPath += 'access_token='+ fb.getAccessToken(srcQuest);

		questOptions['hostname']	= 'graph.facebook.com';
		questOptions['path']		= questPath;
	}

	// console.log('questOptions: ' + JSON.stringify(questOptions) );

	var apiQuest = https.request( questOptions, _processGraphResponse );

	_setupErrorHander(apiQuest);

	apiQuest.end();
	
	/* ============================== */

	function _setupErrorHander(apiQuest)
	{
		apiQuest.on('error', 
			function(e)
			{
				console.error('**** ERROR: Graph Request Failed for path: ' + path + " err:" + e);

				if (error_f)
					error_f(e);
			});			
	}

	function _processGraphResponse(apiQuest)
	{
		var bufferString = '';

		apiQuest.on('data',
			function (chunk) {
				bufferString += chunk;
			} );

		apiQuest.on('end',
			function () {
				try
				{
					var jsonObject = JSON.parse(bufferString);
					if (success_f)
						success_f(jsonObject);						
				}
				catch(e)
				{
					console.error('**** Caught exception while processing Graph response');
					console.error('**** Exception:' + e);

					console.error('**** Stacktrace:');
					handy.errorLogStacktrace(e);

					console.error('**** Buffer String:');
					var bufferToShow = (bufferString.length > 256 ? bufferString.substring(0, 256) : bufferString );

					console.error('**** ' + bufferToShow + '...');

					if (error_f)
						error_f(e);
				}
			} );
	}
}

fb.graph = 
	function( path, srcQuest, success_f /*(fbObject)*/, error_f /* (error) */)
	{
		return _graphCall( 'GET', path, srcQuest, success_f, error_f );
	}


fb.batch =
	function( paths, quest, success_f/* (fbObject) */, error_f/* (error) */)
	{
		var options = {
				host:		'graph.facebook.com'
			,	method:		'POST'
		};

		var batchAPI = [];

		for (var i in paths)
			batchAPI.push( { "method":"GET", "relative_url":paths[i] } );

		var outQuest = https.request(options,
			function (outPonse)
			{
				var str = '';
				outPonse.on('data',
					function (chunk) {
						str += chunk;
					} );

				outPonse.on('end',
					function () {
						if (success_f)
							success_f( JSON.parse(str) );
					} );
			});

		// the data to POST needs to be a string or a buffer
		outQuest.write( 'access_token=' + fb.getAccessToken(quest) );
		outQuest.write( '&' );
		outQuest.write( 'batch=' + JSON.stringify(batchAPI) ) ;
		
		outQuest.end();
	}

