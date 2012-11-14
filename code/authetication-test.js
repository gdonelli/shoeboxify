
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


exports.getAccessToken = function( success_f /* jsonData */, error_f )
	{
		var app = spawn('/tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login');

		app.stdout.on('data',
				function (data) {
					var jsonData = JSON.parse(data);

					exports.auth = jsonData;
					
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


exports.getPseudoSession = function(success_f /* request */, error_f)
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


exports.getPseudoRequest = function(success_f, error_f)
	{
		exports.getAccessToken(
				function success(jsonData){
					exports.getPseudoSession(success_f, error_f);
				}
			,	function error(e){
					throw new Error(e);
				} );
	}


exports.request = function()
	{
		if (exports.pseudoRequest)
		{
			return exports.pseudoRequest;	
		}
		else
			throw new Error('pseudoRequest is undefined');
	}

