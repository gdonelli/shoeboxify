
var		assert	= require("assert")
	,	utils	= require("./utils")

	,	shoeboxify	= require("./shoeboxify")
	;


describe('Utils Test',
	function() {

		// ------
		//  http

		var httpApple = 'http://www.apple.com';

		it( 'Should fetch ' + httpApple,
			function(done) 
			{				
				_test_GET_site(httpApple, done);
			} );

		// -------
		//  https

		var httpsWells = 'https://www.wellsfargo.com';

		it( 'Should fetch ' + httpsWells,
			function(done) 
			{				
				_test_GET_site( httpsWells, done );
			} );

		/* ===================================================== */

		function _test_GET_site( theURL, done )
		{
			utils.GET(	theURL
					,	function success(string) {

							// console.log( 'html index: ' + string.indexOf('<html') );

							assert(string.indexOf('<html') >= 0, 'Cannot find <html> tag');
							assert(string.indexOf('<head') >= 0, 'Cannot find <head> tag');
							assert(string.indexOf('<body') >= 0, 'Cannot find <head> tag');

							done();
						}
					,	function error(e) {
							throw new Error('Cannot fetch ' + theURL);
						}
					);
		}

	} );
