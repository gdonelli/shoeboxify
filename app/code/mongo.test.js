
var		assert	= require("assert")
	,	mongodb	= require('mongodb')
	,	mongo	= require("./mongo")
	;


describe('mongo.js',
	function()
	{

		it( 'init',
			function(done) {			
				mongo.init( 
						function success()
						{
							done();
						}
					,	function error()
						{
							throw new Error('mongo.init failed');
						} );		
			} );

/* ================================================================== */
/* ================================================================== */
/* ===================[   Collection Foundation   ]================== */
/* ================================================================== */
/* ================================================================== */

		describe( 'mongo.collection',
			function()
			{
				var testCollection;

				it( 'mongo.collection.get',
					function(done) 
					{	
						mongo.collection.get('test' 
							,	function success(c)
								{
									testCollection = c;
									done();
								}
							,	function error(e)
								{
									throw new Error('mongo.collection.get failed ' + e);
								} );
					} );

				var sampleId = Math.random() * 100000;
				var sampleIdLong = mongo.LongFromString( '1' + sampleId + '1' );
				var sampleObject = { 
							id: sampleIdLong
						,	 payload: 'Nel cammino di nostra vita mi ritrovai in una selva oscura'
						};

				var sampleObjectMongoId;

				function _addSampleObject(done)
				{
					mongo.collection.add(testCollection, sampleObject
							,	function success(entry)
								{
									assert(entry != undefined, 'addObject expected to return result');
									assert(mongo.entity.getId(entry) != undefined, 'entry.getId(entry) is undefined');
									sampleObjectMongoId = mongo.entity.getId(entry);

									done();
								}
							,	function error(e)
								{
									throw e;
								} );
				}

				it( 'mongo.collection.add',
					function(done) 
					{
						_addSampleObject(done);
					} );


				it( 'mongo.collection.add - same object',
					function(done) 
					{	
						_addSampleObject(done);
					} );


				it( 'mongo.collection.findOne',
					function(done) 
					{
						mongo.collection.findOne(testCollection, { id : sampleIdLong }
							,	function success(r)
								{
									assert(r != undefined, 'r is undefined');
									assert(r.payload != undefined, 'r.payload is undefined');
									done();
								}
							,	function error(e)
								{
									throw e;
								} );
					} );

				it( 'mongo.collection.findAll',
					function(done) 
					{
						mongo.collection.findAll(testCollection, { id : sampleIdLong }
							,	function success(r)
								{	
									assert( r.length == 2, 'findAll expected to find only #2 result, found #'+ r.length);					
									assert(r[0] != undefined, 'r is undefined');
									assert(r[0].payload != undefined, 'r.payload is undefined');

									done();
								}
							,	function error(e)
								{
									throw e;
								} );
					} );

				it( 'mongo.collection.remove {} - expected to fail with no force option',
					function(done) 
					{
						mongo.collection.remove(testCollection, {}
							,	function success(r)
								{	
									throw new Error('remove should fail with findOptions {} and no force option');
								}
							,	function error(e)
								{
									done();
							} );
					} );

				it( 'mongo.collection.remove {} force=true',
					function(done) 
					{
						mongo.collection.remove(testCollection, {}
							,	function success(r)	
								{	
									done();
								}
							,	function error(e)
								{
									throw e;
								}
							, 	{	force: true	} );
					} );


				it( 'mongo.collection.drop - success',
					function(done) 
					{
						mongo.collection.drop(testCollection
							,	function success(r)	
								{	
									assert(r == true, 'r expected to be true');
									done();
								}
							,	function error(e)
								{
									throw e;
								} );
					} );

				it( 'mongo.collection.drop - fail',
					function(done) 
					{
						mongo.collection.drop(testCollection
							,	function success(r)	
								{	
									throw e;
								}
							,	function error(e)
								{
									done();						
								} );
					} );


			} );

/* ================================================================== */
/* ================================================================== */
/* ======================[   User Foundation   ]===================== */
/* ================================================================== */
/* ================================================================== */
		
		function _generateId()
		{
			var sampleId = Math.round(Math.random() * 100000);
			return '1' + sampleId + '1' 
		}

		describe( 'mongo.memento',
			function() {
				
				var userid1 = 'T1'; 
				var userid2 = 'T2';

				it( 'mongo.memento.init ' + userid1,
					function(done) 
					{	
						mongo.memento.init( userid1
							,	function success(r) { done(); }
							,	function error(e) { throw e; } );
					} );

				it( 'mongo.memento.init ' + userid2,
					function(done) 
					{	
						mongo.memento.init( userid2
							,	function success(r) { done(); }
							,	function error(e) { throw e; } );
					} );

				var sampleIdLong = mongo.LongFromString( _generateId() );
				var sampleObject = { 
							id:	sampleIdLong
						,	payload:	'M’illumino\nd’immenso'
						};

				it( 'mongo.memento.add sampleObject to ' + userid1,
					function(done) 
					{	
						mongo.memento.add( userid1, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );

				it( 'mongo.memento.add sampleObject to ' + userid1 + ' - again',
					function(done) 
					{	
						mongo.memento.add( userid1, sampleObject
							,	function success(r){ throw new Error('not expected to work');	}
							,	function error(e){	 done();	} );
					} );


				it( 'mongo.memento.add sampleObject to ' + userid2,
					function(done) 
					{	
						mongo.memento.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'mongo.memento.remove from ' + userid2,
					function(done) 
					{	
						mongo.memento.remove( userid2, { id: sampleIdLong } 
							,	function success(r){ 
									assert(r == 1, 'r expected to be 1');
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'mongo.memento.remove from ' + userid1,
					function(done) 
					{	
						mongo.memento.remove( userid1, {} 
							,	function success(r){ 
									assert(r == 1, 'r expected to be 1, is ' + r);
									done();	
								}
							,	function error(e){	 throw e;	}
							,	{ force: true });
					} );

				it( 'mongo.memento.findAll {} from ' + userid1,
					function(done) 
					{	
						mongo.memento.findAll( userid1, {} 
							,	function success(r){ 
									assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'mongo.memento.findAll {} from ' + userid2,
					function(done) 
					{	
						mongo.memento.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'mongo.memento.add sampleObject to ' + userid2,
					function(done) 
					{	
						mongo.memento.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'mongo.memento.findAll from ' + userid2,
					function(done) 
					{	
						mongo.memento.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 1, 'r.length expected to be 1, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

/* ================================================================== */

				it( 'mongo.memento.removeId from ' + userid1,
					function(done) 
					{	
						mongo.memento.add( userid1, sampleObject
							,	function success(entry) 
								{
									var newObjectId = mongo.entity.getId(entry);

									assert( newObjectId != undefined, 'newObjectId is undefined');

									mongo.memento.removeId(userid1, newObjectId 
										,	function success() {

												mongo.memento.findId(userid1, newObjectId
													,	function success(entry) {
															assert(entry == null, 'entry expected to be null');
															done();
														}
													,	function error(e) {
															throw e;
														});

											}
										,	function error(error) {
												throw e;				
											} );
								}
							,	function error(e){	 throw e;	} );
					} );


/* ================================================================== */
/* ================================================================== */
/* ===================[   User Facebook Methods  ]=================== */
/* ================================================================== */
/* ================================================================== */

				var fakeFacebookObject	= {};
				fakeFacebookObject.id	= _generateId();
				fakeFacebookObject.picture	= 'some picture';
				fakeFacebookObject.source	= 'some source';
				fakeFacebookObject.images	= [];

				var copyObject	= {};
				copyObject.picture	= 'copy picture';
				copyObject.source	= 'copy source';
				copyObject.images	= [];

				function _addFBObject(done, expectedSuccess)
				{
					mongo.memento.addFacebookObject( 
							userid1
						,	fakeFacebookObject.id
						,	fakeFacebookObject
						,	copyObject
						,	function success(r)	{	if (expectedSuccess) done();	else	throw new Error('Success expected');	}
						,	function error(e)	{	if (expectedSuccess) throw e;	else	done();		} 
						);					
				}

				it( 'mongo.memento.addFacebookObject',
					function(done) 
					{
						_addFBObject(done, true);
					} );

				it( 'mongo.memento.addFacebookObject - again - should fail',
					function(done) 
					{	
						_addFBObject(done, false);
					} );

				it( 'mongo.memento.removeFacebookObject',
					function(done) 
					{	
						mongo.memento.removeFacebookObject( 
								userid1
							,	fakeFacebookObject.id
							,	function success(r)	{	done();	}
							,	function error(e)	{	throw e; }
							);
					} );

				it( 'mongo.memento.addFacebookObject - after remove',
					function(done) 
					{	
						_addFBObject(done, true);
					} );

				it( 'mongo.memento.findOneFacebookObject',
					function(done) 
					{	
						mongo.memento.findOneFacebookObject( 
								userid1
							,	fakeFacebookObject.id
							,	function success(r)
								{
									assert( mongo.memento.entity.getFacebookId(r)	!= undefined, 'id is undefined');
									assert( mongo.memento.entity.getFacebookUserId(r)!= undefined, 'user_id is undefined');
									assert( mongo.memento.entity.getFacebookId(r)	== mongo.LongFromString(fakeFacebookObject.id), 'graph id dont match');
									
									done();
								}
							,	function error(e) { throw e; } );
					} );

				it( 'mongo.memento.findAllFacebookObjects',
					function(done) 
					{	
						mongo.memento.findAllFacebookObjects( 
								userid1
							,	function success(r)
								{
									assert(r.length > 0, 'r.length > 0');								
									done();
								}
							,	function error(e) { throw e; } );
					} );


/* ============================ Clean Up ============================ */


				it( 'mongo.memento.drop ' + userid1,
					function(done) 
					{	
						mongo.memento.drop( userid1
							,	function success(r){ 
									assert(r == true, 'drop should return true');
									done();
								}
							,	function error(e){	 throw e; } );
					} );

				it( 'mongo.memento.drop ' + userid1 +' - again',
					function(done) 
					{	
						mongo.memento.drop( userid1
							,	function success(r){ throw new Error('not supposed to work') }
							,	function error(e){	
									assert(e != undefined, 'error is undefined');
							 		done(); } );
					} );

				it( 'mongo.memento.drop ' + userid2,
					function(done) 
					{	
						mongo.memento.drop( userid2
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );

			} );

	} );
