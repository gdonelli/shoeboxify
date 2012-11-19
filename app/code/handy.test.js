
var		assert	= require("assert")
	,	handy	= require("./handy")

	,	shoeboxify	= require("./shoeboxify")
	;


describe('handy.js',
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

		it( 'HEAD ' + httpsWells,
			function(done) 
			{
				handy.HEAD(httpsWells
					,	function success(ponse) {
							// console.log('ponse.headers:');
							// console.log(ponse.headers);
							done();
						}
					,	function error(e) {
							throw e;
						});

			} );

		var dontexist = 'https://sphotos-b.xx.fbcdn.net/hphotos-snc7/575052_10151241240779286_6119758003_n.jpg';

		it( 'HEAD ' + dontexist,
			function(done) 
			{
				handy.HEAD( 
						dontexist
					,	function success(ponse) {
							// console.log('ponse.statusCode: ' + ponse.statusCode);
							// console.log('ponse.headers:');
							// console.log(ponse.headers);
							done();
						}
					,	function error(e) {
							throw e;
						});

			} );


		/* ===================================================== */

		function _test_GET_site( theURL, done )
		{
			handy.GET(	theURL
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
