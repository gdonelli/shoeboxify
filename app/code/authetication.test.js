
var		assert	= require("assert")
	,	fs		= require("fs")
	,	spawn	= require('child_process').spawn
	,	fb		= require("./fb")
	,	shoeboxify	= require("./shoeboxify")
	;



var ACCESS_TOKEN_CACHE_MAX_AGE = 1000 * 60 * 60; // 1 hour


/* ============================================================= */
/* ======================= TEST AUTH =========================== */
/* ============================================================= */

var authTest = exports;

describe('authetication.test.js',
	function() {

		/* Authetication setup */

		it( 'getPseudoRequest', 
			function(done) 
			{
				authTest.getPseudoRequest(
						function success(quest){
							assert(authTest.pseudoRequest != undefined, 'authTest.pseudoRequest is undefined');
							done();
						}
					,	function error(e){
							throw new Error(e);
						});

			} );

		it( 'getPseudoSession',
			function(done) {
				authTest.getPseudoSession(
						function success(ponse) {
							assert( ponse.session.me != undefined,		'ponse.session.me undefined');
							assert( ponse.session.me.id != undefined,	'ponse.session.me.id undefined');
							assert( ponse.session.me.name != undefined,	'ponse.session.me.name undefined');
							assert( ponse.session.me.email != undefined,'ponse.session.me.email undefined');

							done();	
						}
					,	function error(e) {
							throw new Error(e);
						});


			} );

	});

/* =================================================================== */
/* ========================== MODULE API ============================= */
/* =================================================================== */

function _getAccessTokenWithExternalApp( success_f /* jsonData */, error_f )
{
	var app = spawn('/tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login');

	app.stdout.on('data',
			function (data) {

				try {
					var jsonData = JSON.parse(data);
				
					if (success_f)
						success_f(jsonData);			
				}
				catch(e)
				{
					console.error('***** Failed to process auth data. error:');
					console.error(e);

					console.error('**** Data:');
					console.error(data.toString());			

					if (error_f)
						error_f(e);
				}
			});

	app.stderr.on('data',
		function (data) {
			console.log('stderr: ' + data);

			if (error_f)
				error_f(data);
		
		});

	app.on('exit', function (code) {
		assert(code == 0, 'Facebook Login exited with ' + code);

		// console.log('child process exited with code ' + code);
	});	
}

authTest.getAccessToken = function( success_f /* jsonData */, error_f )
	{
		var cacheFilePath = '/tmp/authTest.cache';

		fs.readFile(cacheFilePath,
			function (err, data) {
  				if (err) 
  				{
  					console.log('no cache');

  					_miss();
  				}
  				else
  					var fileContent = data.toString();
  					var cache =  JSON.parse(fileContent);

  					var now = new Date();
  					var then = new Date(cache.date);

  					var cacheAge = now.getTime() - then.getTime();
  					console.log( 'Using cached AccessToken');
  					console.log( 'CacheFile: ' + cacheFilePath);
  					console.log( 'CacheAge:  ' + Math.round( cacheAge / 1000 / 60 * 10 ) / 10 + ' minutes');	

  					if ( cacheAge < ACCESS_TOKEN_CACHE_MAX_AGE )
  					{
  						_useAuth(cache.payload)
  					}
  					else
  						_miss();
			} );

		function _useAuth(jsonData)
		{
			authTest.auth = jsonData;
			
			success_f(jsonData);
		}

		function _miss() {
			_getAccessTokenWithExternalApp( 
					function success(jsonData) 
					{
						_useAuth(jsonData)

						var cache = {};
						cache.date = new Date();
						cache.payload = jsonData;

						fs.writeFile(cacheFilePath, JSON.stringify(cache) );

					}
				,		error_f );
		}
	}


authTest.getPseudoSession = function(success_f /* request */, error_f)
	{
		assert( authTest.auth != undefined,				'authTest.auth undefined');
		assert( authTest.auth.accessToken != undefined,	'authTest.auth.accessToken undefined');
		assert( authTest.auth.expires != undefined,		'authTest.auth.expires undefined');

		authTest.pseudoRequest = {};
		authTest.pseudoRequest.session = {};
		authTest.pseudoRequest.session.accessToken	= authTest.auth.accessToken;
		authTest.pseudoRequest.session.expiresToken	= authTest.auth.expiresToken;

		fb.graph('me', authTest.pseudoRequest,
			function(fbObject)
			{
				authTest.pseudoRequest.session.me = fbObject;

				if (success_f)
					success_f(authTest.pseudoRequest);
			},
			function(e)
			{
				if (error_f)
					error_f(e);
			} );

	}


authTest.getPseudoRequest = function(success_f, error_f)
	{
		authTest.getAccessToken(
				function success(jsonData){
					authTest.getPseudoSession(success_f, error_f);
				}
			,	function error(e){
					throw new Error(e);
				} );
	}


authTest.request = function()
	{
		if (authTest.pseudoRequest)
		{
			return authTest.pseudoRequest;	
		}
		else
			throw new Error('pseudoRequest is undefined');
	}

