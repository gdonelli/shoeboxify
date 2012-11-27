
var		assert	= require("assert")
	,	url		= require("url")
	
	,	service		= require("./service")
	,	mongo		= require("./mongo")
	,	authTest	= require("./authetication.test")
	;


describe('service.js',
	function() {


		describe( 'objectForURL',
			function() {
				it( 'Placeholder Object',
					function(done)
					{
						var sourceURL = "https://sphotos-a.xx.fbcdn.net/hphotos-ash3/73827_622511435310_614274492_n.jpg";

						service.facebookObjectForURL( 
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
									throw new Error('Not expected to get error');
								} );
					} );


				it( 'Actual Object from photo.php',
					function(done)
					{
						var sourceURL = "https://www.facebook.com/photo.php?fbid=10152170979900707&set=a.10150267612520707.502570.554390706&type=1";

						service.facebookObjectForURL( 
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
									throw new Error('Not expected to get error');
								} );
					} );

				it( 'Actual object from .jpg',
					function(done)
					{
						// my profile pict
						var sourceURL = "https://fbcdn-photos-a.akamaihd.net/hphotos-ak-ash3/524874_10152170979900707_270531713_s.jpg";

						service.facebookObjectForURL( 
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
									throw new Error('Not expected to get error');
								} );
					} );

				it( 'No object URL',
					function(done)
					{
						var sourceURL = "https://fbcdn-photos-a.akamaihd.net/hphotos-ak-ash3/524874_XXXXXXXXXXX_270531713_s.jpg";

						service.facebookObjectForURL( 
								authTest.request()
							,	sourceURL
							,	function object(o) {
									throw new Error('Not expected to get object');
								}
							,	function placeholder(p) {
									throw new Error('Not expected to have access to this');
								}
							,	function error(e) {
									done();
								} );
					} );


			} );


		describe( 'copyObject',
			function()
			{

				it( 'Init MongoDB',
					function(done)
					{
						mongo.init(
								function success(c)
								{
									assert(c != undefined, 'collection is undefined');
									done();
								}
							,	function error(e)
								{
									throw new Error(e);
								}
							);
					} );

				it( 'Basic copy',
					function(done)
					{
						var fbid = '10152170979900707';
						service.shoeboxifyFacebookObject(
								authTest.request()
							,	fbid
							,	function success(r, opz)
								{
									assert(r != undefined, 'r is undefined');
									var entityFbId = mongo.memento.entity.getFacebookId(r);

									assert(entityFbId == fbid, 'fbid doesnt match -  entityFbId:' + entityFbId + ' expected: ' +  fbid);
									assert(mongo.memento.entity.getFacebookUserId(r)!= undefined, 'mongo.memento.entity.getFacebookUserId(r) is undefined');
									assert(mongo.memento.entity.getSourceObject(r)	!= undefined, 'mongo.memento.entity.getSourceObject(r) is undefined');
									assert(mongo.memento.entity.getCopyObject(r)	!= undefined, 'mongo.memento.entity.getCopyObject(r) is undefined');

									done();
								}
							,	function error(e)
								{
									throw new Error('copy expected to work');
								} );
					} );
			
			} );


	} );
