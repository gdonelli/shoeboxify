
var		assert	= require("assert")
	,	mongodb	= require('mongodb')
	,	mongo	= require("./mongo")
	;


describe('Mongo Test',
	function() {


		it( 'mongo.init',
			function(done) 
			{			
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


		it( 'mongo.collection.init',
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
					graph_id: sampleIdLong
				,	 payload: 'Nel cammino di nostra vita mi ritrovai in una selva oscura'
				};

		it( 'mongo.collection.addObject',
			function(done) 
			{	
				mongo.collection.addObject(testCollection, sampleObject
					,	function success(r)
						{
							assert(r != undefined, 'addObject expected to return result');
							done();
						}
					,	function error(e)
						{
							throw new Error('addObject failed');
						} );
			} );


		it( 'mongo.collection.addObject - same object',
			function(done) 
			{	
				mongo.collection.addObject(testCollection, sampleObject
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



		it( 'mongo.collection.findOne',
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
							throw new Error('collection.findOne failed');
						} );
			} );


		/* ===================================================== */


	} );
