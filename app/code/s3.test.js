
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
		describe('r + w',
			function() 
			{
				var jsonTestPath = '/test/test.json';

				it( 's3.writeJSON ' + jsonTestPath + ' to s3.test',
					function(done) {
						_simpleJSONWrite( s3.test, jsonTestPath, done, true );
					} );

				it ( 's3.delete ' + jsonTestPath + ' from s3.test',	
					function(done) {
						_deleteFile( s3.test, jsonTestPath, done);
					} );

				it( 's3.writeJSON ' + jsonTestPath + ' to s3.object',
					function(done) {
						_simpleJSONWrite( s3.object, jsonTestPath, done, true );
					} );

				it( 's3.writeJSON ' + jsonTestPath + ' to s3.test',
					function(done) {
						_simpleJSONWrite( s3.test, jsonTestPath, done, false );
					} );

				// ---> /test/shoebox.png

				var shoeboxPath = '/test/shoebox.png';
				it( 's3.copyURL shoebox.png',
					function(done) {
						_simpleCopy(s3.test, 'http://www.shoeboxify.com/images/shoebox.png', shoeboxPath, done, _copyFailed );
					} );

				it ( 's3.delete ' + shoeboxPath + ' from s3.test',
					function(done) {
						_deleteFile(s3.test, shoeboxPath, done);
					} );

				// ---> /test/favicon.ico

				var faviconPath = '/test/favicon.ico';
				it( 's3.copyURL favicon.ico',
					function(done) {
						_simpleCopy(s3.test, 'http://www.shoeboxify.com/favicon.ico', faviconPath, done, _copyFailed );
					} );

				it( 's3.delete ' + faviconPath,	function(done) {
													_deleteFile(s3.test, faviconPath, done);
												} );

				// ---> /test/fbpict.jpg
				var fbpict = '/test/fbpict.jpg';

				it( 's3.copyURL fbpict.jpg',
					function(done) {
						_simpleCopy(s3.test, 
							'https://sphotos-a.xx.fbcdn.net/hphotos-ash3/s320x320/524874_10152170979900707_270531713_n.jpg', 
							fbpict, done, _copyFailed );
					} );

				it( 's3.delete ' + fbpict,		function(done) {
												_deleteFile(s3.test, fbpict, done);
											} );


				it( 's3.copyURL - fail',
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

				it ( 's3.delete ' + jsonTestPath + ' from s3.test',
					function(done) {
						_deleteFile(s3.object, jsonTestPath, done);
					} );

/*
				// We have no way to determine whether the delete operation was succesful...
				// Amazon returns 200 all the time...

				it ( 's3.delete ' + jsonTestPath + ' from s3.test - again',
					function(done) {
						_deleteFileNoInitialCheck(s3.object, jsonTestPath, done);
					} );
*/

				it( 's3.delete 2 files',
					function(done) 
					{
						var path1 = '/test/item1.json';
						var path2 = '/test/item2.json';

						var c = s3.test.clientRW();

						_writeTwoFiles(
							function() {
								_verify(true, 
									function() {
										_deleteTwo(
											function() {
												_verify(false, done);
											} );
									} );								
							} );


						/* ========================= */

						function _writeTwoFiles(done)
						{
							_simpleJSONWrite( s3.test, path1, 
								function() {
									_simpleJSONWrite( s3.test, path2, done, true);
								}, true);
						}

						function _deleteTwo(done) {
							s3.delete( c, [path1, path2]
								, 	function success(ponse)
									{
										assert(ponse != undefined, 'ponse is undefined');
										done();
									}
								,	function error(e) { assert(e != undefined, 'e is undefined' ); throw e;});						
						}

						function _verify( shouldExits, done ) {
							var url1 = c.URLForPath(path1);
							var url2 = c.URLForPath(path2);

							handy.is200OK(url1,
								function(exist1) {
									assert(exist1 == shouldExits, url1 + ' not expected to exist');
									handy.is200OK(url2,
										function(exist2) {
											assert(exist2 == shouldExits, url2 + ' not expected to exist');
											done();
										});
								});
						}

					} );


				/* ========================================================== */

				function _copyFailed(e)
				{
					throw new Error("Copy should succeeed " + e);
				}
			} );

		describe('utils',
			function()
			{
				it( 's3.getInfoForURL',
					function() {
						var meta = s3.getInfoForURL('https://s3-us-west-2.amazonaws.com/shoeboxify.object/130/554390706_A_F_10151242148911730_2012M10D20H4M49_i8.jpg');

						// console.log(meta);

						assert(meta.path	== '/130/554390706_A_F_10151242148911730_2012M10D20H4M49_i8.jpg', 'path doesnt match its: ' + meta.path);
						assert(meta.bucket	== 'shoeboxify.object', 'meta.bucket is ' + meta.bucket + 'expected: shoeboxify.object');
					} );

				it( 's3.getInfoForURLs',
					function() {
						var URLs = [	'https://s3-us-west-2.amazonaws.com/shoeboxify.object/130/554390706_A_F_10151242148911730_2012M10D20H4M49_i8.jpg'
									,	'https://s3-us-west-2.amazonaws.com/shoeboxify.object/130/554390706_A_F_10151242148911730_2012M10D20H4M49_i8.jpg'	];

						var meta = s3.getInfoForURLs(URLs);

						// console.log(meta);
						var expectedPath = '/130/554390706_A_F_10151242148911730_2012M10D20H4M49_i8.jpg';

						assert(meta.bucket	== 'shoeboxify.object', 'meta.bucket is ' + meta.bucket + 'expected: shoeboxify.object');
						assert(meta.paths[0]== expectedPath, 'path doesnt match its: ' + meta.paths[0]);
						assert(meta.paths[1]== expectedPath, 'path doesnt match its: ' + meta.paths[1]);
					} );

			} );

	});

/* ============================================================================= */

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

function _deleteFileNoInitialCheck(destination, thePath, done)
{
	var c = destination.clientRW();

	s3.delete( c, thePath
		, 	function success(ponse)
			{
				assert(ponse != undefined, 'ponse is undefined');

				console.log( 'ponse.statusCode: ' + ponse.statusCode );

				CheckFileExist(c.URLForPath(thePath), false, done);
			}
		,	function error(e) { assert(e != undefined, 'e is undefined' ); throw e;});	
} 
