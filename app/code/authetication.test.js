
var		assert	= require("assert")
	,	spawn	= require('child_process').spawn
	,	fb		= require("./fb")
	,	shoeboxify	= require("./shoeboxify")
	;


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
				var jsonData = JSON.parse(data);

				authTest.auth = jsonData;
				
				if (success_f)
					success_f(jsonData);			
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
		_getAccessTokenWithExternalApp( 
				function success(jsonData) {
					success_f(jsonData);
				}
			,		error_f );
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

