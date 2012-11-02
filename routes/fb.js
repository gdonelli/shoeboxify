
/*
 *		Shoeboxify	<--->	Facebook plumbing
 */

var 	https		= require('https')
	,	querystring	= require('querystring')
	,	md5			= require('MD5')
	,	url			= require('url')

	/* libs */

	,	utils		= require('../lib/utils-lib')
	,	shoeboxify	= require('../lib/shoeboxify')
	;


exports.redirectToAuthentication =
	function(quest, ponse)
	{
		var encodedURL = utils.ASCIItoBase64(quest.url);
		var redirectURL = shoeboxify.facebookLoginPath() + '?source=' + encodedURL;

		ponse.redirect(redirectURL);

		shoeboxify.debug('AUTH-Redirect: ' + redirectURL);
	}


exports.requiresAuthentication = 
	function(quest, ponse, next)
	{
		if ( quest.session.hasOwnProperty('accessToken') )
		{
			next();
		}
		else
		{
			exports.redirectToAuthentication(quest);
		}
	}


exports.isAuthenticated = 
	function(quest)
	{
		return quest.session.hasOwnProperty('accessToken');
	}


exports.login = 
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
				  'client_id'		: shoeboxify.appID()
				, 'redirect_uri'	: shoeboxify.dialogRedirectURL(quest)
				, 'scope'			: shoeboxify.appPermissions()
				, 'state'			: state
			};

		var fbAuthURL = 'https://www.facebook.com/dialog/oauth?' + querystring.stringify(query);

		ponse.redirect(fbAuthURL);
	};


function WriteObject(quest, ponse)
{
	ponse.writeHead(200, {'Content-Type': 'text/html'});

	ponse.write('<html><body>');

	for(var aKey in quest)
		if (quest.hasOwnProperty(aKey))
  		{
			ponse.write( aKey + ": " + quest[aKey] );
			ponse.write('<br>');
		}

	ponse.end('</body></html>');
}


/* ============================================================================= */
exports.response = 
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
								ponse.redirect(source);
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
			var title = quest.session.me.name +' - Login Successful';

			ponse.writeHead(200, {'Content-Type': 'text/html'});

			ponse.write('<html>');

			ponse.write('<head>');
			ponse.write('<title>' + title + '</title>');
			ponse.write('</head>');

			ponse.write('<body>');
			ponse.write('<h1>' + title + '</h1>');

			ponse.write('<p><strong>accessToken: </strong>' + _accessToken(quest) + '</p>');
			ponse.write('<p><strong>expires: </strong>' + _expiresToken(quest) + ' seconds (' + _expiresToken(quest)/(60*60*24) + ' days)</p>');

			ponse.write('</body>');
			
			ponse.end('</html>');
		}

		
		function RespondWithError(title, e)
		{
			shoeboxify.error('Login: ' + e);

			ponse.writeHead(200, {'Content-Type': 'text/html'});

			ponse.write('<html>');

			ponse.write('<head>');
			ponse.write('<title>' + title + '</title>');
			ponse.write('</head>');

			ponse.write('<body>');
			ponse.write('<h1>' + title + '</h1>');
			ponse.write('<p> Error: ' + e +'</p><br>');
			ponse.write('<p style="color:red">Please report this error at error[at]shoeboxify.com</p>');
			ponse.write('</body>');
			
			ponse.end('</html>');
		}

		function AccessTokenFromCode( consumeTokenFunction /* (token, expiration) */ 
									, errorFunction /* errString */) 
		{
			console.log('AccessTokenFromCode: '+ code);

			var query = {
				  'code'			: code
				, 'client_id'		: shoeboxify.appID()
				, 'client_secret'	: shoeboxify.appSecret()
				, 'redirect_uri'	: shoeboxify.dialogRedirectURL(quest)
				
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
									if (errorFunction)
										errorFunction( 'accessToken:' + accessToken +' expiresInSeconds:' + expiresInSeconds);
								}
									
								consumeTokenFunction(accessToken, expiresInSeconds);
							}
							else
							{
								console.error('tokenPonse.statusCode: ' + tokenPonse.statusCode);

								if (errorFunction)
									errorFunction('tokenPonse.statusCode: ' + tokenPonse.statusCode + ' resBuffer:' + resBuffer);
							}
  						} );
				} );
			
			tokenQuest.on('error',
				function(e) {
  					console.error(e);
  					if (errorFunction)
	  					errorFunction('AccessTokenFromCode -> tokenQuest.on(error):' + e + ' for URL: ' + accessTokenURL);
				} );

			tokenQuest.end();
		}

		/* ============================= */
		function StartSession(accessToken, expiresInSeconds, nextFunction, errorFunction)
		{
			 _setAccessToken(quest, accessToken, expiresInSeconds ); 
			quest.session.cookie.maxAge = Math.floor(expiresInSeconds) * 1000; 

			// Store me information in the Session
			exports.graph('me', quest,
				function(fbObject)
				{
					var meKeys = ['id', 'name', 'first_name', 'last_name', 'link', 'username', 'gender', 'email', 'timezone', 'locale', 'updated_time'];

					var meInfo = DictionaryWithOnlyKeys(fbObject, meKeys);

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
					if (errorFunction)
						errorFunction(error);
				} );

		}

	};

function _accessToken(quest)
{
	return quest.session.accessToken;	
}

function _expiresToken(quest)
{
	return quest.session.expiresToken;	
}


function _setAccessToken(quest, token, expires )
{
	quest.session.accessToken = token;
	quest.session.expiresToken = expires;
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
	function( path, srcQuest, consumeFunction /*(fbObject)*/, errorFunction /* (error) */)
	{
		shoeboxify.debug('GRAPH: ' + path );

		var questOptions = { method: 'GET' };

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
			questPath += 'access_token='+ _accessToken(srcQuest);

			questOptions['hostname']	= 'graph.facebook.com';
			questOptions['path']		= questPath;
		}

		// shoeboxify.debug('questOptions: ' + JSON.stringify(questOptions) );

		var apiQuest = https.request( questOptions, _processGraphResponse );

		_setupErrorHander(apiQuest);

		apiQuest.end();


		
 		/* ============================== */

		function _setupErrorHander(apiQuest)
		{
			apiQuest.on('error', 
				function(e)
				{
					shoeboxify.error('**** ERROR: Graph Request Failed for path: ' + path + " err:" + e);

					if (errorFunction)
						errorFunction(e);
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
						if (consumeFunction)
							consumeFunction(jsonObject);						
					}
					catch(e)
					{
						console.error('**** exception: ' + e );

						console.error('Failed to process graph response:' + bufferString);

						if (errorFunction)
							errorFunction(e);
					}
				} );
		}

	}


exports.batch =
	function( paths, quest, consumeFunction/* (fbObject) */, errorFunction/* (error) */)
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
						if (consumeFunction)
							consumeFunction( JSON.parse(str) );
					} );
			});

		// the data to POST needs to be a string or a buffer
		outQuest.write( 'access_token=' + _accessToken(quest) );
		outQuest.write( '&' );
		outQuest.write( 'batch=' + JSON.stringify(batchAPI) ) ;
		
		outQuest.end();
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

exports.sanitizeObject = 
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
				exports.redirectToAuthentication(quest, ponse);
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
	function(quest, ponse)
	{
		var urlElements = url.parse(quest.url, true);
		var urlQuery = urlElements['query'];

		ponse.writeHead(200, { 'Content-Type': 'application/json' } );

		shoeboxify.debug(quest.url);

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
		else if ( !exports.isAuthenticated(quest) )
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
				exports.graph( fbID, quest,
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
			ponse.end( JSON.stringify(result) );
		}
		
	}

