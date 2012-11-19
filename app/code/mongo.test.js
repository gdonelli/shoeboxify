
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
			function() {


				var testCollection;

				it( 'get',
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
				function _addSampleObject(done)
				{
					mongo.collection.add(testCollection, sampleObject
							,	function success(r)
								{
									assert(r != undefined, 'addObject expected to return result');
									done();
								}
							,	function error(e)
								{
									throw e;
								} );
				}

				it( 'addObject',
					function(done) 
					{
						_addSampleObject(done);
					} );


				it( 'addObject - same object',
					function(done) 
					{	
						_addSampleObject(done);
					} );


				it( 'findOne',
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

				it( 'findAll',
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

				it( 'remove all expected to fail. no force option',
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

				it( 'remove all by forcing',
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

				it( 'drop',
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

				it( 'drop fail',
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

		describe( 'mongo.user',
			function() {
				
				var userid1 = 'T1'; 
				var userid2 = 'T2';

				it( 'init ' + userid1,
					function(done) 
					{	
						mongo.user.init( userid1
							,	function success(r) { done(); }
							,	function error(e) { throw e; } );
					} );

				it( 'init ' + userid2,
					function(done) 
					{	
						mongo.user.init( userid2
							,	function success(r) { done(); }
							,	function error(e) { throw e; } );
					} );

				var sampleIdLong = mongo.LongFromString( _generateId() );
				var sampleObject = { 
							id:	sampleIdLong
						,	payload:	'M’illumino\nd’immenso'
						};

				it( 'add to ' + userid1,
					function(done) 
					{	
						mongo.user.add( userid1, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );

				it( 'add to ' + userid1 + ' - again',
					function(done) 
					{	
						mongo.user.add( userid1, sampleObject
							,	function success(r){ throw new Error('not expected to work');	}
							,	function error(e){	 done();	} );
					} );


				it( 'add to ' + userid2,
					function(done) 
					{	
						mongo.user.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'remove from ' + userid2,
					function(done) 
					{	
						mongo.user.remove( userid2, { id: sampleIdLong } 
							,	function success(r){ 
									assert(r == 1, 'r expected to be 1');
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'remove from ' + userid1,
					function(done) 
					{	
						mongo.user.remove( userid1, {} 
							,	function success(r){ 
									assert(r == 1, 'r expected to be 1, is ' + r);
									done();	
								}
							,	function error(e){	 throw e;	}
							,	{ force: true });
					} );

				it( 'findAll from ' + userid1,
					function(done) 
					{	
						mongo.user.findAll( userid1, {} 
							,	function success(r){ 
									assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );



				it( 'findAll from ' + userid2,
					function(done) 
					{	
						mongo.user.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'add to ' + userid2,
					function(done) 
					{	
						mongo.user.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'findAll from ' + userid2,
					function(done) 
					{	
						mongo.user.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 1, 'r.length expected to be 1, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

/* ================================================================== */
/* ================================================================== */
/* ===================[   User Facebook Methods  ]=================== */
/* ================================================================== */
/* ================================================================== */

				var fakeFacebookObject = {};
				fakeFacebookObject.id = _generateId();
				fakeFacebookObject.picture = 'some picture';
				fakeFacebookObject.source  = 'some source';

				var copyObject = {};
				copyObject.picture = 'copy picture';
				copyObject.source  = 'copy source';

				function _addFBObject(done, expectedSuccess)
				{
					mongo.user.addFacebookObject( 
							userid1
						,	fakeFacebookObject.id
						,	fakeFacebookObject
						,	copyObject
						,	function success(r)	{	if (expectedSuccess) done();	else	throw new Error('Success expected');	}
						,	function error(e)	{	if (expectedSuccess) throw e;	else	done();		} 
						);					
				}

				it( 'addFacebookObject',
					function(done) 
					{
						_addFBObject(done, true);
					} );

				it( 'addFacebookObject - again',
					function(done) 
					{	
						_addFBObject(done, false);
					} );

				it( 'removeFacebookObject',
					function(done) 
					{	
						mongo.user.removeFacebookObject( 
								userid1
							,	fakeFacebookObject.id
							,	function success(r)	{	done();	}
							,	function error(e)	{	throw e; }
							);
					} );

				it( 'addFacebookObject - after remove',
					function(done) 
					{	
						_addFBObject(done, true);
					} );

				it( 'findOneFacebookObject',
					function(done) 
					{	
						mongo.user.findOneFacebookObject( 
								userid1
							,	fakeFacebookObject.id
							,	function success(r)
								{
									assert( mongo.entry.getFacebookId(r)	!= undefined, 'id is undefined');
									assert( mongo.entry.getFacebookUserId(r)!= undefined, 'user_id is undefined');
									assert( mongo.entry.getFacebookId(r)	== mongo.LongFromString(fakeFacebookObject.id), 'graph id dont match');
									
									done();
								}
							,	function error(e) { throw e; } );
					} );

				it( 'findAllFacebookObjects',
					function(done) 
					{	
						mongo.user.findAllFacebookObjects( 
								userid1
							,	function success(r)
								{
									assert(r.length > 0, 'r.length > 0');								
									done();
								}
							,	function error(e) { throw e; } );
					} );


/* ============================ Clean Up ============================ */


				it( 'drop ' + userid1,
					function(done) 
					{	
						mongo.user.drop( userid1
							,	function success(r){ 
									assert(r == true, 'drop should return true');
									done();
								}
							,	function error(e){	 throw e; } );
					} );

				it( 'drop ' + userid1 +' - again',
					function(done) 
					{	
						mongo.user.drop( userid1
							,	function success(r){ throw new Error('not supposed to work') }
							,	function error(e){	
									assert(e != undefined, 'error is undefined');
							 		done(); } );
					} );

				it( 'drop ' + userid2,
					function(done) 
					{	
						mongo.user.drop( userid2
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );



			} );

	} );
