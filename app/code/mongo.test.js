
var		assert	= require("assert")
	,	mongodb	= require('mongodb')
	,	mongo	= require("./mongo")
	;


describe('mongo->',
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

		/* ===================================================== */
		/* ==================== collection ===================== */
		/* ===================================================== */

		describe( 'collection->',
			function() {

				it( 'init',
					function(done) 
					{	
						mongo.collection.init('test' 
							,	function success()
								{
									done();
								}
							,	function error()
								{
									throw new Error('mongo.collection.init failed');
								} );
						
					} );

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
							graph_id: sampleIdLong
						,	 payload: 'Nel cammino di nostra vita mi ritrovai in una selva oscura'
						};

				it( 'addObject',
					function(done) 
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
					} );


				it( 'addObject - same object',
					function(done) 
					{	
						mongo.collection.add(testCollection, sampleObject
							,	function success(r)
								{
									throw new Error('collection.addObject is supposed to fail with the same object');
								}
							,	function error(e)
								{
									// console.log(e);
									assert(e != undefined, 'error is undefined');
									assert(e.code != 1100, 'Expected duplicated key error');
									done();
								} );
					} );


				it( 'findOne',
					function(done) 
					{
						mongo.collection.findOne(testCollection, { graph_id : sampleIdLong }
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
						mongo.collection.findAll(testCollection, { graph_id : sampleIdLong }
							,	function success(r)
								{	
									assert( r.length == 1, 'findAll expected to find only #1 result, found #'+ r.length);					
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

		/* ===================================================== */
		/* ======================= user ======================== */
		/* ===================================================== */

		describe( 'user->',
			function() {
				
				var userid1 = 'T1'; 
				var userid2 = 'T2';

				it( 'init',
					function(done) 
					{	
						mongo.user.init( userid1
							,	function success(r)
								{
									done();
								}
							,	function error(e)
								{
									throw e;
								} );
					} );

				var sampleId = Math.random() * 100000;
				var sampleIdLong = mongo.LongFromString( '1' + sampleId + '1' );
				var sampleObject = { 
							graph_id: sampleIdLong
						,	 payload: 'M’illumino\nd’immenso'
						};

				it( 'add to 1',
					function(done) 
					{	
						// console.log('1 sampleObject:');
						// console.log(sampleObject);

						mongo.user.add( userid1, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );

				it( 'add to 1 - again',
					function(done) 
					{	
						// console.log('2 sampleObject:');
						// console.log(sampleObject);

						mongo.user.add( userid1, sampleObject
							,	function success(r){ throw new Error('not expected to work');	}
							,	function error(e){	 done();	} );
					} );


				it( 'add to 2',
					function(done) 
					{	
						mongo.user.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'remove from 2',
					function(done) 
					{	
						mongo.user.remove( userid2, { graph_id: sampleIdLong } 
							,	function success(r){ 
									assert(r == 1, 'r expected to be 1');
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'findAll from 2',
					function(done) 
					{	
						mongo.user.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'add to 2',
					function(done) 
					{	
						mongo.user.add( userid2, sampleObject
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'findAll from 2',
					function(done) 
					{	
						mongo.user.findAll( userid2, {} 
							,	function success(r){ 
									assert(r.length == 1, 'r.length expected to be 1, is: ' + r.length);
									done();	
								}
							,	function error(e){	 throw e;	});
					} );

				it( 'drop 1',
					function(done) 
					{	
						mongo.user.drop( userid1
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	});
					} );

				it( 'drop 1 - again',
					function(done) 
					{	
						mongo.user.drop( userid1
							,	function success(r){ throw new Error('not supposed to work') }
							,	function error(e){	 done(); });
					} );

				it( 'drop 2',
					function(done) 
					{	
						mongo.user.drop( userid2
							,	function success(r){ done();	}
							,	function error(e){	 throw e;	} );
					} );


			} );


	} );
