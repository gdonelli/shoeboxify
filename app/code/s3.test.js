
var		assert	= require("assert")
	,	https	= require("https")
	,	http	= require("http")
	,	url		= require("url")

	,	s3 			= require("./s3")
	,	handy		= require("./handy")
	,	shoeboxify	= require("./shoeboxify")
	;


function CheckFileExist(aPath, shouldExist, done)
{
	handy.is200OK(aPath,
		function(value)
		{ 
			assert(value == shouldExist, 'file (' + aPath + ') expected to exist:' + shouldExist );

			if (done)
				done();
		} );
}


describe('s3.js',
	function() 
	{
		var jsonTestPath = '/test/test.json';

		it( 'write ' + jsonTestPath + ' to s3.test',
			function(done) {
				_simpleJSONWrite( s3.test, jsonTestPath, done, true );
			} );

		it ( 'delete ' + jsonTestPath + ' from s3.test',	
			function(done) {
				_deleteFile( s3.test, jsonTestPath, done);
			} );

		it( 'write ' + jsonTestPath + ' to s3.object',
			function(done) {
				_simpleJSONWrite( s3.object, jsonTestPath, done, true );
			} );

		it( 'write ' + jsonTestPath + ' to s3.test',
			function(done) {
				_simpleJSONWrite( s3.test, jsonTestPath, done, false );
			} );

		// ---> /test/shoebox.png

		var shoeboxPath = '/test/shoebox.png';
		it( 'Copy shoebox.png',
			function(done) {
				_simpleCopy(s3.test, 'http://www.shoeboxify.com/images/shoebox.png', shoeboxPath, done, _copyFailed );
			} );

		it ( 'delete ' + shoeboxPath + ' from s3.test',
			function(done) {
				_deleteFile(s3.test, shoeboxPath, done);
			} );

		// ---> /test/favicon.ico

		var faviconPath = '/test/favicon.ico';
		it( 'Copy favicon.ico',
			function(done) {
				_simpleCopy(s3.test, 'http://www.shoeboxify.com/favicon.ico', faviconPath, done, _copyFailed );
			} );

		it( 'Delete ' + faviconPath,	function(done) {
											_deleteFile(s3.test, faviconPath, done);
										} );

		// ---> /test/fbpict.jpg
		var fbpict = '/test/fbpict.jpg';

		it( 'Copy fbpict.jpg',
			function(done) {
				_simpleCopy(s3.test, 
					'https://sphotos-a.xx.fbcdn.net/hphotos-ash3/s320x320/524874_10152170979900707_270531713_n.jpg', 
					fbpict, done, _copyFailed );
			} );

		it( 'Delete ' + fbpict,		function(done) {
										_deleteFile(s3.test, fbpict, done);
									} );


		it( 'Copy doNotExist',
			function(done) {
				_simpleCopy(s3.test, 'http://www.shoeboxify.com/doDotExist', '/test/doDotExist'
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

		it ( 'delete ' + jsonTestPath + ' from s3.test',
			function(done) {
				_deleteFile(s3.object, jsonTestPath, done);
			} );

		/* ========================================================== */

		function _copyFailed(e)
		{
			throw new Error("Copy should succeeed " + e);
		}

	});


function _simpleCopy(destination, url, path, doneF, errorF)
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


function _simpleJSONWrite(destination, thePath, done, shouldSucceed)
{
	var now = new Date();
	var object = { today: now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() };

	var clientS3;

	if (shouldSucceed)
		clientS3 = destination.clientRW();
	else
		clientS3 = destination.clientR();

	// console.log('thePath: ' + thePath);

	var stringWritten = s3.writeJSON( clientS3, object, thePath,
		function success(ponse) {
			assert.equal(ponse.statusCode, 200);

			handy.GET(	clientS3.URLForPath(thePath)
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


function _deleteFile(destination, thePath, done)
{
	var c = destination.clientRW();

	CheckFileExist(c.URLForPath(thePath), true, 
		function()
		{
			s3.delete( c, thePath
				, 	function success(ponse)
					{
						assert(ponse != undefined, 'ponse is undefined');

						CheckFileExist(c.URLForPath(thePath), false, done);
					}
				,	function error(e) { assert(e != undefined, 'e is undefined' ); throw e;});						
		} );
} 

