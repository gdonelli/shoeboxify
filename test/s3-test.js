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
				SimpleWriteToBucket('test', done);
			} );

		it( 'Should write to [object] bucket', 
			function(done) {
				SimpleWriteToBucket('object', done);
			} );
	
		it( 'Should write to [cache] bucket', 
			function(done) {
				SimpleWriteToBucket('cache', done);
			} );



		it( 'Should copy shoebox.png',
			function(done) {
				SimpleCopy('test', 'http://www.shoeboxify.com/images/shoebox.png', '/test/shoebox.png', done, _copyFailed );
			} );

		it( 'Should copy favicon.ico',
			function(done) {
				SimpleCopy('test', 'http://www.shoeboxify.com/favicon.ico', '/test/favicon.ico', done, _copyFailed );
			} );

		it( 'Should copy doDotExist',
			function(done) {
				SimpleCopy('test', 'http://www.shoeboxify.com/doDotExist', '/test/doDotExist'
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

function SimpleCopy(bucket, url, path, doneF, errorF)
{
	var clientS3 = s3.client.test.RW();

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

function SimpleWriteToBucket(bucket, done)
{
	var now = new Date();

	var object = { today: now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds() };
	var path = '/test.json';

	var stringWritten = s3.writeJSON( s3.client[bucket].RW(), object, path, 
		function(ponse){
			assert.equal(ponse.statusCode, 200);

			getFile(https, s3.bucket[bucket].URL(path),
				function(data){
					assert( stringWritten == data , 'data pushed to s3 is different: original(' + stringWritten +') vs expected(' + data + ')' );
					done();
				});
		} );
}


function getFile(method, fileUrl, done /* (string) */)
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

