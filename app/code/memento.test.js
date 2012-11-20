
var		assert	= require("assert")
	,	url		= require("url")
	
	,	mongo		= require("./mongo")
	,	memento		= require("./memento")
	,	authTest	= require("./authetication.test")
	;


describe('memento.js',
	function() {

		/* Authetication setup */

		describe( 'memento',
			function() 
			{

				it( 'memento.init',
					function(done)
					{
						memento.init( 	function success(){	done();	}
									,	function error(e){	throw e;}	);
					} );

				it( 'memento.initUser',
					function(done)
					{
						memento.initUser( testUserId
								,	function success(){	done();	}
								,	function error(e){	throw e;}	
							);
					} );

				var testUserId = 'T1';
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
						,	function error(e) 
							{ 
								throw e;
							} );
				}

				it( 'memento.add',
					function(done)
					{
						_addSJPhoto(done);
					} );

				it( 'memento.add again',
					function(done)
					{
						_addSJPhoto(done, 
							function(optz) {
								assert( optz.already == true, 'photo should be there already' );
							});
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
								,	function error(e) { throw e; } );

					} );

				it( 'memento.removeId',
					function(done)
					{
						memento.removeId(testUserId, addedEntryId
							,	function success(elapsedTime)
								{
									console.log('memento.removeId took: ' + elapsedTime + 'ms');
									
									memento.findId(testUserId, addedEntryId
										,	function success(entry)
											{
												assert(entry == null,  'entry is not null! ' + entry);
												done();
											}
										,	function error(e) { throw e; } );
								}
							,	function error(e) { throw e; } );
					} );


			} );


	} );
