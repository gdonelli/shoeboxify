
var		assert	= require("assert")
	,	handy	= require("./handy")
	;


describe('handy.js',
	function() {

		describe('String',
			function() {
				var sampleText =  'Here s to the crazy one';

				it('String.startsWith', 
					function() {
						assert(sampleText.startsWith('Here'), 'expected to startsWith Here');
						assert(!sampleText.startsWith('ere'), 'expected not to startsWith ere');
					} );

				it('String.endsWith', 
					function() {
						assert(sampleText.endsWith('one'), 'expected to endsWith one');
						assert( !sampleText.endsWith('cne'), 'expected not to endsWith cne');
					} );
			} );

		describe('HTTP Handy Operations',
			function() {

				var httpApple = 'http://www.apple.com';

				it( 'handy.GET(http...) ' + httpApple,
					function(done) 
					{				
						_test_GET_site(httpApple, done);
					} );

				var httpsWells = 'https://www.wellsfargo.com';

				it( 'handy.GET(https...) ' + httpsWells,
					function(done) 
					{				
						_test_GET_site( httpsWells, done );
					} );

				it( 'handy.HEAD ' + httpsWells,
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

				it( 'handy.HEAD ' + dontexist,
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
				

				// it( 'fail test',
				// 	function() 
				// 	{
				// 		 assert(false, 'this will fail');
				// 		//throw new Error('this will fail');
				// 	} );

				
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

		describe('TmpDirectory',
			function() {
				it('handy.rmTmpDirectory',
					function() {
						handy.rmTmpDirectory();
					} );

				it('handy.tmpDirectory',
					function() {
						handy.tmpDirectory();
					} );
			} );

	} );
