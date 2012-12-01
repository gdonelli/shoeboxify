
var		assert  = require("assert")

	,	OperationQueue = require("./operation").queue
	;


describe('operationqueue.js',
	function() {

		describe( 'OperationQueue',
			function() {

					var result = '';

					var a = function(done) {
								setTimeout( function(){ result += 'a'; done(); }, 400 ); 
							};

					var b = function(done) {
								setTimeout( function(){ result += 'b'; done(); }, 200 ); 
							};

					var c = function(done) {
								setTimeout( function(){ result += 'c'; done(); }, 50 ); 
							};
					
					it ('wait - sequential', 
						function(done)
						{
							result = '';

							var queue = new OperationQueue( 1, [ a, b, c ] );

							// console.log(queue);

							queue.wait(
								function() { 
									assert( result == 'abc', 'returned: ' + result );
									done();
								});

							assert( queue.waitCount() == 2, 'expecting 3 operations in the queue instead:' + queue.waitCount() );

						} );


					it ('wait - parallel', 
						function(done)
						{
							result = '';

							var queue = new OperationQueue( 10, [ a, b, c ] );

							queue.wait(
								function() { 
									assert( result == 'cba', 'returned: ' + result );
									done();
								});

							assert( queue.waitCount() == 0, 'expecting 3 operations in the queue instead:' + queue.waitCount() );
						} );

					it ('q.abort', 
						function(done)
						{
							result = '';

							var q = new OperationQueue( 1 );

							q.on('abort',
								function(e) {
									assert(e.message == 'cazzo', 'error expected to be cazzo');
									assert(result == 'ab',  'aborted');
									assert(q.waitCount() == 0, 'waitCount expected to be 0');
									
									done();
								});

							q.add(a);
							q.add(b);

							q.add(
								function(){
									q.abort(new Error('cazzo'));
								} );

							q.add(c);



						} );

					it ('queue exception', 
						function(done)
						{
							result = '';

							var q = new OperationQueue( 1 );

							q.on('abort',
								function(e) {
									assert(e.message == 'cazzo', 'error expected to be cazzo');
									assert(result == 'ab',  'aborted');
									assert(q.waitCount() == 0, 'waitCount expected to be 0');
									
									done();
								});

							q.add(a);
							q.add(b);

							q.add(
								function(){
									throw new Error('cazzo');
								} );

							q.add(c);

						} );

			} );
	} );

