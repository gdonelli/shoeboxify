//
// s3-test.js
//


var		assert = require("assert")
	,	https = require("https")
	,	http = require("http")
	,	url = require("url")

	,	s3 = require("../lib/s3")
	,	shoeboxify = require("../lib/shoeboxify");


describe('Shoeboxify S3',
	function() {

		it( 'Should write to [test] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.test, done, true );
			} );

		it( 'Should write to [object] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.object, done, true );
			} );
	
		it( 'Should write to [cache] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.cache, done, true );
			} );

		it( 'Should not write to [test] bucket', 
			function(done) {
				SimpleWriteToBucket( s3.test, done, false );
			} );

		it( 'Should copy shoebox.png',
			function(done) {
				SimpleCopy(s3.test, 'http://www.shoeboxify.com/images/shoebox.png', '/test/shoebox.png', done, _copyFailed );
			} );

		it( 'Should copy favicon.ico',
			function(done) {
				SimpleCopy(s3.test, 'http://www.shoeboxify.com/favicon.ico', '/test/favicon.ico', done, _copyFailed );
			} );

		it( 'Should copy fbpict.jpg',
			function(done) {
				SimpleCopy(s3.test, 
					'https://sphotos-a.xx.fbcdn.net/hphotos-ash3/s320x320/524874_10152170979900707_270531713_n.jpg', 
					'/test/fbpict.jpg', done, _copyFailed );
			} );

		it( 'Should copy doDotExist',
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

	})

function SimpleCopy(destination, url, path, doneF, errorF)
{
	var clientS3 = destination.readwrite();

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
	var path = '/test/test.json';


	var clientS3;

	if (shouldSucceed)
		clientS3 = destination.readwrite();
	else
		clientS3 = destination.read();

	var stringWritten = s3.writeJSON( clientS3, object, path,
		function sucess(ponse) {
			assert.equal(ponse.statusCode, 200);

			GetFile(https, destination.URL(path),
				function(data){
					assert( stringWritten == data , 'data pushed to s3 is different: original(' + stringWritten +') vs expected(' + data + ')' );
					if (shouldSucceed)
						done();
				});
		},
		function error(e) {
			assert(e != undefined, 'error passed is undefined');
			assert(e.response != undefined, 'error.response is undefined');

			if (!shouldSucceed)
				done();
		} );
}


function GetFile(method, fileUrl, done /* (string) */)
{
	// console.log('GET ' + fileUrl);

	var quest = method.get(fileUrl,
		function(ponse) {
			// console.log("statusCode: ", ponse.statusCode);
			// console.log("headers: ", ponse.headers);

			var buffer = '';

			ponse.on('data', function(chuck) {
				buffer += chuck;
			});

			ponse.on('end', function() {
				if (done)
					done(buffer);
			});

		})

	quest.on('error', function(e) {
			console.error(e);
		});
}

