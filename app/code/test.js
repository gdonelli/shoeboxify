/* 

===========[   Server side unit testing   ]===========

Routes:
			test.route.test	(test.path.test)
		
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

var test = exports;

test.k 		= {}
test.path	= {};
test.route	= {};

// Konstant

test.k.AccessTokenCacheFilePath = '/tmp/com.shoeboxify.accessTokenCache.json';


/*
 * 		Route:		/test
 */

test.path.test = '/test';

test.route.test =
	function(quest, ponse)
	{
		handy.routeDebugPage( ponse, test, 'test' );
	}


/*
 * 		Route:		/test/unit
 */

test.path.unitTest = '/unit-test/:module?';

test.route.unitTest =
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

		// console.log('urlElements:');
		// console.log(urlElements);

		WriteAccessTokenCache(quest,
			function() 
			{
				if ( quest.params.module && 
					!quest.params.module.startsWith(':'))
				{
					RunTests( [ __dirname + '/' + quest.params.module + '.test.js' ] );
				}
				else
				{
					_getAllTestFiles( function(files){	RunTests(files);	});
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

					dataString = _consoleStringToHTML(dataString);

					dataString = dataString.replace('✔', '<span style="color: green;">[OK]</span>');
					dataString = dataString.replace('◦', '[--]');

					dataString = dataString.replace('[2K', '');
					dataString = dataString.replace('[0G', '');

					ponse.write('<code>');
					ponse.write( dataString );

					if (data.length > 8)
						ponse.write( '<br>' );

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
				mochaProcess.kill('SIGKILL');
				mochaProcess.kill('SIGKILL');
				mochaProcess.kill('SIGKILL');
				mochaProcess.kill('SIGKILL');
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

	fs.writeFile(test.k.AccessTokenCacheFilePath, cacheContent,
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

/*
 *		Route: intense-image-resample
 */


test.path.intense = '/test/intense-image-resample';

test.route.intense =
	function(quest, ponse)
	{
		var iphoneImagePath	= handy.testDirectory('iPhone4S.JPG');

		console.log('-> ' + test.path.intense);

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

/*
 *		Route: cmd
 */

test.path.resampleQueueCount = '/test/resample-queue-count';

test.route.resampleQueueCount =
	function(quest, ponse)
	{
		ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

		ponse.write('<html><body>');
		ponse.write('<h1> imageshop.resampleQueue().waitCount() = ' + imageshop.resampleQueue().waitCount() + '</h1>');
		ponse.end('</body></html>');
	};


/*
 *		Route: shell
 */

test.path.shell = '/test/shell/:command?';

test.route.shell =
	function(quest, ponse)
	{
		ponse.writeHead( 200, { 'Content-Type': 'text/html' } );

		ponse.write('<html><body>');

		if (	quest.params.command == undefined || 
				quest.params.command.startsWith(':') )
		{
			ponse.write('<h1>Expected shell command</h1>');
			return ponse.end('</body></html>');
		}


		ponse.write('<h1>' + quest.params.command + '</h1>');

		var elements = quest.params.command.split(' ');

		var cmd = elements[0];
		
		var args = [];

		if (elements.length > 2)
			args = _.range( 1, elements.length );

		var cmdProcess = spawn( cmd, args );

		setTimeout( _kill, 60 * 1000 ); // one minute max to complete

		cmdProcess.stdout.on('data',
			function (data) {
				ponse.write('<code>');
				
				var inputString = data.toString();
				ponse.write( _consoleStringToHTML(inputString) );			
				
				console.log(inputString);
				
				ponse.write('</code>');
			});

		cmdProcess.stderr.on('data',
			function (data) {
				ponse.write('<code style="color:red;">');

				var inputString = data.toString();
				ponse.write( _consoleStringToHTML(inputString) );			

				ponse.write('</code>');
			});

		cmdProcess.on('exit',
			function (code) {
				ponse.write('<p>exit with code: ' + code + '</p>');
				ponse.end('</body></html>');
			});

		function _kill() 
		{
			cmdProcess.kill();
		}
	}	

function _consoleStringToHTML(str)
{
	var result = '';

	for (var i=0; i<str.length; i++)
	{
		switch ( str.charCodeAt(i) )
		{
			case 10:	result += '<br>';	break;			
			case 32:	result += '&nbsp;';	break;
			default:	result += str.charAt(i);
		}
	}

	return result;
}

