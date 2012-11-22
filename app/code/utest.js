
var 	assert	= require('assert')
	,	spawn	= require('child_process').spawn
	,	fs		= require('fs')
	,	path	= require('path')
	,	_		= require('underscore')

	,	fb		= require('./fb')
	;


var utest = exports;

utest.path = {};
utest.route = {};

utest.path.utest = '/utest';

utest.accessTokenCacheFilePath = '/tmp/com.shoeboxify.accessTokenCache.json';

utest.route.utest =
	function(quest, ponse)
	{	
		ponse.writeHead(200, {'Content-Type': 'text/html'});

		ponse.write('<html><body>');
		ponse.write('<h1>Unit Testing</h1>');
	
		WriteAccessTokenCache(quest,
			function() 
			{
				_getAllTestFiles( 
					function(files)
					{
						RunTests(files);
					} );
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

			mochaProcess.stdout.on('data',
				function (data) {

					var dataString = data.toString();
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
				});

			mochaProcess.stderr.on('data',
				function (data) {
					ponse.write('<p style="color:red;">');
					ponse.write( data.toString().replace('\n', '<br>') );
					ponse.write('</p>');
				});

			mochaProcess.on('exit',
				function (code) {
					ponse.write('<p>exit with code: ' + code + '</p>');
					ponse.end('</body></html>');
				});
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

