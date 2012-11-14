
var		assert	= require("assert")
	,	service	= require("./service")
	,	url		= require("url")
	
	,	authTest	= require("./authetication-test")
	,	shoeboxify	= require("./shoeboxify")
	;


describe('Shoeboxify Service',
	function() {

		it( 'getPseudoRequest should succeed', 
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


		describe( 'objectForURL',
			function() {

				it( 'Placeholder Object',
					function(done)
					{
						var sourceURL = "https://sphotos-a.xx.fbcdn.net/hphotos-ash3/73827_622511435310_614274492_n.jpg";

						service.objectForURL( 
								authTest.request()
							,	sourceURL
							,	function object(o) {
									throw new Error('Not expected to have access to this');
								}
							,	function placeholder(p) {
									assert( p.id == '622511435310', 'placeholder ID doesnt match. Given: ' + p.id);
									assert( p.source == sourceURL, 'placeholder.source doesnt match. Given: ' + p.source);
									done();
								}
							,	function error(e) {
									throw new Error('Not expected to get placeholder');
								} );
					} );


				it( 'Actual Object from photo.php',
					function(done)
					{
						var sourceURL = "https://www.facebook.com/photo.php?fbid=10152170979900707&set=a.10150267612520707.502570.554390706&type=1";

						service.objectForURL( 
								authTest.request()
							,	sourceURL
							,	function object(o) {
									assert( o.id == '10152170979900707', 'object ID doesnt match. Given: ' + o.id);
									assert( o.picture != undefined,	'o.picture is undefined');
									assert( o.source != undefined,	'o.source is undefined');
									done();
								}
							,	function placeholder(p) {
									throw new Error('Not expected to have access to this');
								}
							,	function error(e) {
									throw new Error('Not expected to get placeholder');
								} );
					} );

				it( 'Actual Object from .jpg',
					function(done)
					{
						var sourceURL = "https://fbcdn-photos-a.akamaihd.net/hphotos-ak-ash3/524874_10152170979900707_270531713_s.jpg";

						service.objectForURL( 
								authTest.request()
							,	sourceURL
							,	function object(o) {
									assert( o.id == '10152170979900707', 'object ID doesnt match. Given: ' + o.id);
									assert( o.picture != undefined,	'o.picture is undefined');
									assert( o.source != undefined,	'o.source is undefined');
									done();
								}
							,	function placeholder(p) {
									throw new Error('Not expected to have access to this');
								}
							,	function error(e) {
									throw new Error('Not expected to get placeholder');
								} );
					} );


			} );

	} );
