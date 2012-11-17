
var		assert	= require("assert")
	,	https	= require("https")
	,	http	= require("http")
	,	url		= require("url")

	,	s3 			= require("./s3")
	,	handy		= require("./handy")
	,	shoeboxify	= require("./shoeboxify")
	;


describe('S3',
	function() {

		it( 'Write to [test] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.test, done, true );
			} );

		it( 'Write to [object] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.object, done, true );
			} );
	

		it( 'Fail to write to [test] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.test, done, false );
			} );

		it( 'Copy shoebox.png',
			function(done) {
				SimpleCopy(s3.test, 'http://www.shoeboxify.com/images/shoebox.png', '/test/shoebox.png', done, _copyFailed );
			} );

		it( 'Copy favicon.ico',
			function(done) {
				SimpleCopy(s3.test, 'http://www.shoeboxify.com/favicon.ico', '/test/favicon.ico', done, _copyFailed );
			} );

		it( 'Delete favicon.ico',
			function(done) {
				var clientTestS3 = s3.test.clientRW();

				s3.delete(clientTestS3, '/test/favicon.ico', 
					done, 
					function error(e){
						throw e;
					} );
			} );


		it( 'Copy fbpict.jpg',
			function(done) {
				SimpleCopy(s3.test, 
					'https://sphotos-a.xx.fbcdn.net/hphotos-ash3/s320x320/524874_10152170979900707_270531713_n.jpg', 
					'/test/fbpict.jpg', done, _copyFailed );
			} );

		it( 'Copy doDotExist',
			function(done) {
				SimpleCopy(s3.test, 'http://www.shoeboxify.com/doDotExist', '/test/doDotExist'
					,	function sucess(bytes){
							throw new Error("Copy should not succeeed bytes written:" + bytes);
						}
					,	function error(e){

							// console.log(e);
							// console.log(e.message);

							done();
						}
					);
			} );

		function _copyFailed(e)
		{
			throw new Error("Copy should succeeed " + e);
		}

	});

function SimpleCopy(destination, url, path, doneF, errorF)
{
	var clientS3 = destination.clientRW();

	s3.copyURL(clientS3, url, path, 
			function sucess(nbytes){
				if (doneF)
					doneF();
			}
			
		,	function error(e){
				if (errorF)
					errorF(e)
			}

		,	function progess(p) {
				assert(p != undefined, 'expected progress object');
				assert(p.total != undefined, 'expected progress.total');
				assert(p.written!= undefined, 'expected progress.written');
				assert(p.percent != undefined, 'expected progress.percent');
				// console.log( p.percent + '%' + ' : ' + path);
			} );

}

function SimpleWriteToBucket(destination, done, shouldSucceed)
{
	var now = new Date();
	var object = { today: now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() };

	var theDestinationPath = '/test/test.json';

	var clientS3;

	if (shouldSucceed)
		clientS3 = destination.clientRW();
	else
		clientS3 = destination.clientR();

	// console.log('theDestinationPath: ' + theDestinationPath);

	var stringWritten = s3.writeJSON( clientS3, object, theDestinationPath,
		function success(ponse) {
			assert.equal(ponse.statusCode, 200);

			handy.GET(	clientS3.URLForPath(theDestinationPath)
					,	function _200OK(readBuffer) {
							assert( stringWritten == readBuffer , 'data pushed to s3 is different: written(' + stringWritten +') vs read(' + readBuffer + ')' );
							if (shouldSucceed)
								done();
						}
					,	function other(ponse) { throw new Error('other response') } 
					,	function error(e) { throw e } 
					);

		},
		function error(e) {
			assert(e != undefined, 'error passed is undefined');
			assert(e.response != undefined, 'error.response is undefined');

			if (!shouldSucceed)
				done();
		} );
}

