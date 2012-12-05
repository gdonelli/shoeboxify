
var		assert	= require("assert")
	,	fb		= require("./fb")
	,	authTest = require("./authetication.test")
	;



describe('fb.js',
	function() 
	{
		 it( 'Graph: /me',
			function(done) {

				fb.graph( '/me', authTest.request()
					,	function success(meObject) {
							assert(meObject != undefined , 'fbObject is undefined');
							assert(meObject.id != undefined , 'meObject.id is undefined');
							assert(meObject.email != undefined , 'meObject.email is undefined');
							done();
						}
					,	function error(e) {
							throw e;
						}

					);

			} );

	} );

