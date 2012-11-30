
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

							var queue = new OperationQueue( [ a, b, c ], undefined, 1);

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

							var queue = new OperationQueue( [ a, b, c ] );

							queue.wait(
								function() { 
									assert( result == 'cba', 'returned: ' + result );
									done();
								});

							assert( queue.waitCount() == 0, 'expecting 3 operations in the queue instead:' + queue.waitCount() );
						} );


					
			} );
	} );

