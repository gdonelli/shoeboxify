
var		assert	= require("assert")
	,	https	= require("https")
	,	http	= require("http")
	,	url		= require("url")
	,	util  = require('util')
	,	spawn = require('child_process').spawn

	,	fb		= require("./fb")
	,	utils	= require("./utils")

	,	shoeboxify	= require("./shoeboxify")
	;


exports.getAccessToken = function( success_f, error_f )
	{
		var app = spawn('/tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login');

		app.stdout.on('data',
				function (data) {
					var jsonData = JSON.parse(data);
					
					if (success_f)
						success_f(jsonData);
			
					exports.auth = jsonData;
				});

		app.stderr.on('data',
			function (data) {
				console.log('stderr: ' + data);

				if (error_f)
					error_f(data);
			
			});

		app.on('exit', function (code) {
			console.log('child process exited with code ' + code);
		});

	}


exports.getPseudoSession = function(success_f, error_f)
	{
		assert( exports.auth != undefined,				'exports.auth undefined');
		assert( exports.auth.accessToken != undefined,	'exports.auth.accessToken undefined');
		assert( exports.auth.expires != undefined,		'exports.auth.expires undefined');

		exports.pseudoRequest = {};
		exports.pseudoRequest.session = {};
		exports.pseudoRequest.session.accessToken	= exports.auth.accessToken;
		exports.pseudoRequest.session.expiresToken	= exports.auth.expiresToken;

		fb.graph('me', exports.pseudoRequest,
			function(fbObject)
			{
				exports.pseudoRequest.session.me = fbObject;

				if (success_f)
					success_f(exports.pseudoRequest);
			},
			function(e)
			{
				if (error_f)
					error_f(e);
			} );

	}


describe('Facebook authentication ->',
	function() 
	{
		var pseudoSessionQuest = {};

		it( 'Get access token via Facebook Login.app',
			function(done) {
				exports.getAccessToken(
						function success(auth)
						{
							assert( auth != undefined,				'auth undefined');
							assert( auth.accessToken != undefined,	'auth.accessToken undefined');
							assert( auth.expires != undefined,		'auth.expires undefined');

							done();
						}
					,	function error(e)
						{
							throw new Error(e);
						} );
			} );

		it( 'Compose pseudo-session',
			function(done) {
				exports.getPseudoSession(
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
	} );

