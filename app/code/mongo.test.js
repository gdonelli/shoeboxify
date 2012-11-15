
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


	} );
