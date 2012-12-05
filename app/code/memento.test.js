
var		assert	= require("assert")
	,	url		= require("url")
	
	,	mongo		= require("./mongo")
	,	memento		= require("./memento")
	,	authTest	= require("./authetication.test")
	;


describe('memento.js',
	function() {

	var testUserId = 'T1';

	function std_error_handler(e)
	{
		console.error('error:');
		console.error(e);
		throw e;
	}

	/* Authetication setup */

	describe( 'init',
			function() 
			{
				it( 'memento.init',
					function(done)
					{
						memento.init( 	function success(){	done();	}
									,	std_error_handler	
									);
					} );

				it( 'memento.initUser',
					function(done)
					{
						memento.initUser( testUserId
								,	function success(){	done();	}
								,	std_error_handler	
								);
					} );

			});
		
		describe.skip( 'memento.addFromURL',
			function() 
			{
				// Facebook object with no permission:
				// var url = 'https://sphotos-a.xx.fbcdn.net/hphotos-snc6/308558_10150305083479286_1064774048_n.jpg';

				it( 'with no permission',
					function(done)
					{
						var url = 'http://shoeboxify.com/images/shoebox.png';

						memento.addFromURL(
								testUserId
							,	url
							,	authTest.request()
							,	function success(newEntry, meta) {
									console.log('newEntry:');
									console.log(newEntry);
									console.log('meta:');
									console.log(meta);
									done();
								}
							,	std_error_handler
							);
					} );

			});

		describe( 'basics',
			function() 
			{
				var sjPhotoId = '10151242148911730';

				var addedEntryId;

				function _addSJPhoto(done, processOptions_f /* (options) */ )
				{
					memento.addFacebookObject( testUserId
						,	sjPhotoId
						,	authTest.pseudoRequest
						,	function success(r, options)
							{	
								assert( sjPhotoId ==  mongo.memento.entity.getFacebookId(r), ' sjPhotoId != fbObjectId(r)' );

								addedEntryId = mongo.entity.getId(r);

								// console.log('sjEntryId: ' + sjEntryId);

								if (processOptions_f)
									processOptions_f(options);

								done();
							}
						,	std_error_handler
						);
				}

				it( 'memento.addFacebookObject',
					function(done)
					{
						_addSJPhoto(done);
					} );

				it( 'memento.addFacebookObject again',
					function(done)
					{
						_addSJPhoto(done, 
							function(optz) {
								assert( optz.already == true, 'photo should be there already' );
							});
					} );
				
				it( 'memento.addFacebookObject - not a photo`',
					function(done)
					{
						memento.addFacebookObject( testUserId
							,	"554390706"
							,	authTest.pseudoRequest
							,	function success(r, options)
								{	
									throw new Error('not supposed to succeed');
								}
							,	function error(e)
								{
									// console.log(e);
									done();
								}
							);
					} );

				it( 'memento.findId',
					function(done)
					{
						memento.findId(testUserId, addedEntryId
								,	function success(entry)
									{
										assert(	mongo.entity.getId(entry).equals(addedEntryId), 
												'entity id doesnt match: ' + mongo.entity.getId(entry) + ' vs: ' +  addedEntryId);
										
										done();
									}
								,	std_error_handler
								);

					} );

				it( 'memento.removeId',
					function(done)
					{
						memento.removeId(testUserId, addedEntryId
							,	function success(elapsedTime)
								{
									// console.log('memento.removeId took: ' + elapsedTime + 'ms');

									memento.findId(testUserId, addedEntryId
										,	function success(entry)
											{
												assert(entry == null,  'entry is not null! ' + entry);
												done();
											}
										,	function error(e) { throw e; } );
								}
							,	std_error_handler
							);
					} );


			} );


		describe( 'memento.facebookIdForURL',
			function() 
			{
				it( 'photo.php',
					function()
					{
						var link = 'https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf';
						var id = memento.facebookIdForURL(link);
						var expected = '426454000747131';

						assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
					} );

				it( 'direct link',
					function()
					{
						var link = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg';
						var id = memento.facebookIdForURL(link);
						var expected = '10151324834642873';

						assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
					} );

				it( 'wrong link',
					function()
					{
						var link = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3/10151324834642873_1967677028_n.jpg';
						var id = memento.facebookIdForURL(link);
						var expected = undefined;

						assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
					} );

				it( 'wrong link 2',
					function()
					{
						var link = 'https://sphotos-b.xx.fbcdn.net/hphotos-ash3';
						var id = memento.facebookIdForURL(link);
						var expected = undefined;

						assert(id == expected, 'wrong id: ' + id + ' expected: ' + expected);
					} );

			} );


	} );
