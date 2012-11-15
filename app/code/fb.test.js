
var		assert	= require("assert")
	,	fb		= require("./fb")
	,	authTest = require("./authetication.test")
	,	shoeboxify	= require("./shoeboxify")
	;



describe('Facebook authentication ->',
	function() 
	{
		var pseudoSessionQuest = {};

		it( 'Get access token via Facebook Login.app',
			function(done) {
				authTest.getAccessToken(
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
	} );

