/* 

===========[   Server side unit testing   ]===========

Routes:
			utest.route.utest	(utest.path.utest)
		
======================================================

*/

var 	assert	= require('assert')
	,	spawn	= require('child_process').spawn
	,	fs		= require('fs')
	,	path	= require('path')
	,	url		= require('url')
	,	_		= require('underscore')

	,	fb			= require('./fb')
	,	handy		= require('./handy')
	,	imageshop	= require('./imageshop')
	;


var utest = exports;

utest.path = {};
utest.route = {};

utest.accessTokenCacheFilePath = '/tmp/com.shoeboxify.accessTokenCache.json';


/*
 * 		Route:		/utest
 */

utest.path.utest = '/utest/:module?';

utest.route.utest =
	function(quest, ponse)
	{	
		ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

		ponse.write('<html><body>');

		if (quest.params.module)
		{
			ponse.write('<h1>Running unit test: ' + quest.params.module + '</h1>');
		}
		else
		{
			ponse.write('<h1>Running all unit tests</h1>');
		}
	
		var urlElements = url.parse(quest.url, true);

		console.log('urlElements:');
		console.log(urlElements);

		WriteAccessTokenCache(quest,
			function() 
			{
				if (quest.params.module)
				{
					RunTests( [ __dirname + '/' + quest.params.module + '.test.js' ] );
				}
				else
				{
					_getAllTestFiles( 
						function(files)
						{
							RunTests(files);
						} );
				}

			} );

		/* ============================================================ */
	
		function RunTests(files)
		{
			var mochaBin = __dirname + '/../node_modules/mocha/bin/mocha' ;
			
			var basicArgs = [mochaBin, '-t', '10000', '-R', 'spec', '--no-colors' ];

			var args = _.union(basicArgs, files);

			ponse.write('<h2>Test files:</h2>');
			ponse.write('<code>');

			for (var i in files) {
				var file_i = files[i];
				ponse.write(path.basename(file_i) + '<br>');
			}

			ponse.write('</code>');

			ponse.write('<h2>command:</h2>');
			ponse.write('<code>' + args.toString() + '</code>');

			ponse.write('<h2>Run:</h2>');


			var mochaProcess = spawn('node', args);

			setTimeout( _kill, 60 * 1000 ); // one minute max to complete

			mochaProcess.stdout.on('data',
				function (data) {
					var dataString = data.toString();
										
					var heristicEnd = (	dataString.contains('tests complete') );

					dataString = dataString.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;');
					dataString = dataString.replace(' ', '&nbsp;');
					dataString = dataString.replace('✔', '<span style="color: green;">[OK]</span>');
					dataString = dataString.replace('◦', '[--]');


					dataString = dataString.replace('[2K', '');
					dataString = dataString.replace('[0G', '');

					ponse.write('<code>');
					ponse.write( dataString );

					if (data.length > 8)
						ponse.write( '<br>' );

					// console.log('buf.length '+ data.length + ':');
					// console.log(dataString);

					ponse.write('</code>');

					if (heristicEnd) {
						ponse.write('will send KILL in 3 seconds');		
						setTimeout( _kill, 3000 );
					}
				
				});

			mochaProcess.stderr.on('data',
				function (data) {
					var dataString = data.toString();

					ponse.write('<p style="color:red;">');
					ponse.write( dataString.replace('\n', '<br>') );
					ponse.write('</p>');


					if ( dataString.contains('tests failed') )
					{
						ponse.write('will send KILL in 3 seconds');		
						setTimeout( _kill, 3000 );
					}

				});

			mochaProcess.on('exit',
				function (code) {
					ponse.write('<p>exit with code: ' + code + '</p>');
					ponse.end('</body></html>');
				});

			function _kill() 
			{
				mochaProcess.kill();
			}
		}

	};


function AccessTokenCache(quest)
{
	var accessToken = fb.getAccessToken(quest);
	var expiresToken = fb.getExpiresToken(quest);

	assert(accessToken	!= undefined, 'accessToken is undefined');
	assert(expiresToken	!= undefined, 'expiresToken is undefined');

	var object = {	'accessToken'	: accessToken,
					'expires'		: expiresToken	};

	var result = {};
	
	result.payload = object;

	return result;
}


function WriteAccessTokenCache(quest, done_f)
{
	var cache = AccessTokenCache(quest);

	var cacheContent = JSON.stringify(cache)

	console.log('cacheContent: ' + cacheContent);

	var fs = require('fs');

	fs.writeFile(utest.accessTokenCacheFilePath, cacheContent,
		function(err) 
		{
		    if(err) 
		    {
		        console.log(err);
		    } else
		    {
		        console.log("The file was saved!");
		        done_f();
		    }
		} ); 
}


function _getAllTestFiles( done_f /* arrayOfFiles */ )
{
	fs.readdir(__dirname,
		function(err, files) {

			var allTestFiles = [];

			for (var i = 0; i < files.length; i++ )
			{
				var file_i = files[i];
				
				if (file_i.endsWith('.test.js'))
					allTestFiles.push( __dirname + '/' + file_i);
			}

			done_f( allTestFiles.sort() );
		} );

}


utest.path.intense = '/test/intense-image-resample';

utest.route.intense =
	function(quest, ponse)
	{
		var iphoneImagePath	= handy.testDirectory('iPhone4S.JPG');

		console.log('-> ' + utest.path.intense);

		ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

		ponse.write('<html><body>');
		ponse.write('<h1>intense-image-resample</h1>');

		var count = 0;
		var maxCount = 20;

		for ( var i=0; i<maxCount; i++ )
		{
			imageshop.safeResample(	iphoneImagePath
								,	imageshop.k.defaultResampleOptions
							 	,	function success(path, size)
							 		{
							 			assert(size.width == 2048, 'image width expected to be 2048');									
										ponse.write(path + '<br>');
							 			fs.unlink(path);
							 			isDone();
							 		}
								,	function error(e)
									{ 
										ponse.write( e.message + ' code: '+ e.code + '<br>' );
										isDone();
								 	} );			
		}	

		function isDone()
		{
			count++;

			if (count >= maxCount)
			{
				ponse.end('</body></html>');
			}
		}
	}

