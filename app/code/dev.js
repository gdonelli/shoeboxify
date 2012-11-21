
var		url		= require('url')
	,	assert	= require('assert')
	,	email	= require("emailjs/email")
	,	knox	= require('knox')
	,	_		= require('underscore')

	,	fb	= require('./fb')
	,	s3	= require('./s3')

	,	debug	= require('./debug-lib')
	,	handy	= require('./handy')
	,	mongo	= require('./mongo')
	,	shoeboxify	= require('./shoeboxify')
	;

/* ================================ EXPORTS ==================================== */

/* ============================================================================= */


function _goToGraph(quest, ponse, path)
{
	ponse.redirect('/dev/exploreGraph?api=' + handy.ASCIItoBase64(path) );
}


exports.whoami = 
	function(quest, ponse)
	{
		_respondWithGraphInfoPage(quest, ponse, 'me?metadata=1');
	};


exports.testEmail = 
	function(quest, ponse)
	{
		ponse.writeHead(200, {'Content-Type': 'text/html'});
		ponse.write('<html><body>');

		EmailStarts('<html><body> <h1 style="color: green;">Ciao!</h1> </body></html>');

		ponse.end('</body></html>');
	}


function SendTextEmail( toAddress, subject, textMessage )
{
		var server = email.server.connect(
			{
				user:		"hello+shoeboxify.com", 
				password:	"camper12", 
				host:		"server49.web-hosting.com", 
				ssl:		true
			} );

		// send the message and get a callback with an error or details of the message that was sent

		var message = {
		   text:    textMessage,
		   from:    "Shoeboxify Survey <hello@shoeboxify.com>", 
		   to:      toAddress,
		   cc:      "Shoeboxify Survey <hello@shoeboxify.com>",
		   subject: subject
		};

		server.send( message, 
			function(err, message)
			{	
				console.log(err || message); 
			} );
}


function SendHTMLEmail( toAddress, subject, htmlMessage )
{
		var server = email.server.connect(
			{
				user:		"hello+shoeboxify.com", 
				password:	"camper12", 
				host:		"server49.web-hosting.com", 
				ssl:		true
			} );

		// send the message and get a callback with an error or details of the message that was sent

		var message = {
		   text:    "This is Shoeboxify stats email",
		   from:    "Shoeboxify Survey <hello@shoeboxify.com>", 
		   to:      toAddress,
		   cc:      "Shoeboxify Survey <hello@shoeboxify.com>",
		   subject: subject,

		   attachment: [ { data: htmlMessage, alternative:true } ]
		};

		server.send( message, 
			function(err, message)
			{	
				console.log(err || message); 
			} );
}


exports.me = 
	function(quest, ponse)
	{
		ponse.writeHead(200, {'Content-Type': 'text/html'});
		ponse.write('<html><body>');

		ponse.write( debug.ObjectToHTML(quest.session.me, 'quest.session.me') ) ;

		ponse.end('</body></html>');	
	}


exports.checkfriends = 
	function(quest, ponse)
	{
		var path = 'me/friends';

		var finalHTMLMessage = '';

		function ResWrite(string)
		{
			finalHTMLMessage+=string;
			return ponse.write(string);
		}

		SendTextEmail( 'stats@shoeboxify.com', quest.session.me.username + ' checkfriends', quest.session.me.link );

		fb.graph( 'me/friends', quest, 
			function(fbFriends)
			{
				var friendsInfoArray = fbFriends['data'];

				ponse.writeHead(200, {'Content-Type': 'text/html'});
				ResWrite('<html><body>');

				ResWrite('<h1>' + quest.session.me.name + ' these are your friends photo permissions</h1>');
				ResWrite('<div>Green indicates friends whose photos are accessibile by 3rd party applications <br>');
				
				ResWrite('It takes a while...<br>');
				ResWrite('You can close this window if you want. The end result will be emailed to you and to the Shoeboxify team.</div>');
				ResWrite('You have <span style="font-family:sans-serif;font-size:22px; color:black">' + friendsInfoArray.length + ' friends</span><br>');

				ResWrite('<div><br><br><span style="background-color:yellow; color: blue; padding: 16px;">Thank you for helping out</span ></div>');
				ResWrite('<br><br>');

				var processIndex = 0;

				var NUM_OF_PARALLEL_REQUESTS = 5;

				var friendsWithPhotosCount = 0;
				var friendsNoPhotosCount = 0;
				var errorCount = 0;

				var MAX_N_FRIENDS = 5000;
		
				if (friendsInfoArray.length == 0)
				{
					TheEnd()
				}
				else
					for ( var i=0; i<NUM_OF_PARALLEL_REQUESTS; i++ )
							ProcessNext();

				function ProcessNext()
				{
					// console.log('Process index: ' + processIndex);

					var indexToProcess = processIndex++;

					if (friendsWithPhotosCount + friendsNoPhotosCount + errorCount >= friendsInfoArray.length || 
						indexToProcess > MAX_N_FRIENDS ) 
					{
						TheEnd();
					}

					ProcessIndexInArray( indexToProcess, friendsInfoArray, 
						function( success )
						{
							if (success)
							{
								if (indexToProcess>0 && indexToProcess%50 == 0) {
									ResWrite('<span style="font-family:sans-serif;font-size:16px; color:black"> ' + indexToProcess + ' </span>');
									ResWrite('<span style="font-family:sans-serif;font-size:16px; color:red"> (' + RedPercent() + '%) </span>');
								}
									
								ProcessNext();									

							}
						});	

				}

				function RedPercent()
				{
					var totFriends = (friendsWithPhotosCount + friendsNoPhotosCount);
					if (totFriends>0)
						return Math.round( (friendsNoPhotosCount / totFriends ) * 100 );
					else
						return 0;
				}

				function TheEnd()
				{
					ResWrite('<br>');
					ResWrite('<br>');
					ResWrite('<div style="font-family:sans-serif;font-size:22px; color:green">' + friendsWithPhotosCount +'</div>');

					var percent = RedPercent();

					ResWrite('<div style="font-family:sans-serif;font-size:22px; color:red">' + friendsNoPhotosCount + ' - ('+ percent + '%' + ')</div>');

					ResWrite('<br>');
					ResWrite('<br>');

					ResWrite('<div style="font-family:sans-serif;font-size:32px; color:#5CB3FF">DONE! Thank you!</div>');

					ResWrite('</body></html>');

					ponse.end();


					SendHTMLEmail( quest.session.me.email, 'About your friends', finalHTMLMessage );
				}


				function ProcessIndexInArray( index, array, doneFunction)
				{
					if (index < 0 || index >= array.length)
					{
						console.error('ProcessIndexInArray index out of bounds');
						return;
					}

					var friendInfo	= array[index];
					var friendID	= friendInfo['id'];
					var friendName	= friendInfo['name'];

					// console.log( friendName + ' - ' + friendID );

					processFriend(friendName, friendID);

					function processFriend(name, id)
					{
						fb.graph( id + '/photos', quest,
							function (fbObject)
							{
								var shouldContinue = true;

								if (fbObject) {
									var photos = fbObject['data'];

									if (photos)
									{
										var hasPhotos = (photos.length > 0);

										if (hasPhotos)
											friendsWithPhotosCount++;
										else
											friendsNoPhotosCount++;

										shouldContinue = ResWrite( '<span style="font-family:sans-serif;font-size:11px; color:' + ( hasPhotos ? 'green' : 'red') + '">' +  name  + '</span>');
										ResWrite( '<span  style="color:#CCC"> &ndash; </span>' );
									}
									else
									{
										errorCount++;

										shouldContinue = ResWrite( '<span style="color:purple">' +  name  + '</span>');
									}
								}
	
								doneFunction( /*shouldContinue*/ true );
							} );
					}

				}
			} );


	};

function _respondWithGraphInfoPage(quest, ponse, graphURL)
{
	fb.graph(graphURL, quest, 
		function success(fbObject)
		{
			shoeboxify.debug('_ponsepondWithGraphInfoPage - sucess');

			if ( !fb.sanitizeObject(quest, ponse, fbObject) )
				return;

			ponse.writeHead(200, {'Content-Type': 'text/html'});
			ponse.write('<html><body>');
			ponse.write(debug.ObjectToHTML(fbObject,  graphURL));
			ponse.end('</body></html>');
		},
		function fail(error)
		{
			shoeboxify.debug('_respondWithGraphInfoPage - error:' + error);

			return;
		} );
}


exports.exploreGraph = 
	function(quest, ponse)
	{		
		var urlElements	  = url.parse(quest.url, true);

		// console.log('urlElements: ' + JSON.stringify(urlElements) );

		var queryElements = urlElements['query'];

		if (!queryElements)
			return RespondError('queryElements is null');

		// console.log('queryElements: ' + queryElements ) ;

		var apiCall = queryElements['api'];

		if (!apiCall)
			return RespondError('apiCall is null');
		else
		{
			var graphURL = handy.Base64toASCII(apiCall);

			_respondWithGraphInfoPage(quest, ponse, graphURL);

		}

		function RespondError(e)
		{
			ponse.writeHead(200, {'Content-Type': 'text/html'});
			ponse.write('<html><body>');
			ponse.write('<h1>' + e + '</h1>');
			ponse.end('</body></html>');
		}

	}


exports.criticalError = 
	function(quest, ponse)
	{
		ponse.writeHead(200, {'Content-Type': 'text/html'});
		ponse.write('<html><body>');

		ponse.write('<h1>' + 'Critical error' + '</h1>');

		ponse.end('</body></html>');
	}


/* ============================================================================= */


exports.myphotos = 
	function(quest, ponse)
	{
		ponse.writeHead(200, {'Content-Type': 'text/html'});
		ponse.write('<html><body>');

		LoadPhotos( 'me/photos', 10 );


		function LoadPhotos( path, maxDepth)
		{
			if (maxDepth <=0)
			{
				return endResponse();
			}

			fb.graph(path, quest, 
				function success(fbObject)
				{
					var data	= fbObject['data'];
					var paging	= fbObject['paging'];
					var next;

					if (paging)
						next = paging['next'];

					WriteIMGwithData(data);

					// ponse.write('<div>' + next + '</div>\n');
					if (next)
						LoadPhotos( next, maxDepth - 1);
					else
						endResponse();
				},
				function error(e)
				{
					ponse.write('failed with error: ' + e);

					endResponse();
				}
				);

			function endResponse()
			{
				ponse.end('</body></html>');
			}

		}

		function WriteIMGwithData(data)
		{			
			AssertArray(data);

			for (var index in data)
			{
				var pictureInfo_i = data[index];

				var pictureURL = pictureInfo_i['picture'];

				ponse.write('<img src="' + pictureURL + '"></img>\n');
			}
		}
	};


exports.session = 
	function(quest, ponse)
	{
		ponse.writeHead(200, {'Content-Type': 'text/html'});
		ponse.write('<html><body>');

		ponse.write( debug.ObjectToHTML( quest.session,  'agent.sockets' ) );

		ponse.end('</body></html>');

	}


function AssertArray(obj)
{
	var objectType = Object.prototype.toString.call( obj );
			
	var isArray = (objectType === '[object Array]');

	assert(isArray, 'object is not an array as expected ' + objectType);
}


exports.drop = 
	function(quest, ponse)
	{
		 ponse.render('drop');
	}


exports.s3test =	
	function(quest, ponse)
	{
		var object = { foo: "reduced storage" };
	
		s3.writeJSON( s3.client.test.RW(), object, '/test/reduced.json' );
	};


exports.permissions =
	function(quest, ponse)
	{
		_respondWithGraphInfoPage(quest, ponse, '/me/permissions');
	};

function _outMessage(quest, ponse, message)
{
	ponse.writeHead(200, {'Content-Type': 'text/html'});
	ponse.write('<html><body>');

	ponse.write('<html><body>'+ message + '</body></html>');

	ponse.end('</body></html>');
}

exports.rmsession =
	function(quest, ponse)
	{
		quest.session.destroy();

		_outMessage(quest, ponse, 'session removed');
	};


//
// ===============================================================
//



exports.shoeboxified=
	function(quest, ponse)
	{
		// console.log("mongotest");

		ponse.writeHead(200, {'Content-Type': 'text/html'});

		ponse.write('<html><body>');
		ponse.write('<h1>' + 'Shoeboxified' + '</h1><div>');

		mongo.memento.findAllFacebookObjects( fb.me(quest, 'id')
			,	function success(r)
				{
					for (var i in r)
					{
						var object_i = r[i];
						
						var sourcePict	= object_i.source.picture;
						var copyPict	= object_i.copy.picture;
/*
						console.log('sourcePict: ' + sourcePict);
						console.log('  copyPict: ' + copyPict);
*/

						ponse.write('<img src="' + sourcePict + '"></img>\n');
						// ponse.write('<img src="' + copyPict + '"></img>\n');
					}

					ponse.end('</div></body></html>');

				}
			,	function error(e){
					console.log('find returned error:');
					console.log(e);
				});		


	};


function _getAllTestFiles( done_f /* arrayOfFiles */ )
{
	var fs = require('fs');

	fs.readdir(__dirname,
		function(err, files) {

			var allTestFiles = [];

			for (var i = 0; i < files.length; i++ )
			{
				var file_i = files[i];
				
				if (file_i.endsWith('.test.js'))
					allTestFiles.push( __dirname + '/' + file_i);
			}

			done_f(allTestFiles);
		} );

}

exports.utest =
	function(quest, ponse)
	{
		var spawn = require('child_process').spawn;
	
		ponse.writeHead(200, {'Content-Type': 'text/html'});

		ponse.write('<html><body>');
		ponse.write('<h1>mocha tests</h1>');
	
		_getAllTestFiles( 
			function(files){
				// console.log(files);
				RunTests(files);

			} );
	
		function RunTests(files)
		{
			var mochaBin = __dirname + '/../node_modules/mocha/bin/mocha' ;
			
			var basicArgs = [mochaBin, '-t', '10000', '-R', 'spec', '--no-colors' ];

			var args = _.union(basicArgs, files);

			ponse.write('<p>' + args.toString() + '</p>');

			var mochaProcess = spawn('node', args);

			mochaProcess.stdout.on('data',
				function (data) {

					var dataString = data.toString();
					// dataString = dataString.replace('\n', '<br>');
					dataString = dataString.replace('\t', '&nbsp;&nbsp;&nbsp;&nbsp;');
					dataString = dataString.replace(' ', '&nbsp;');
					dataString = dataString.replace('✔', '[OK]');
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

exports.utest_off =
	function(quest, ponse)
	{
		var mocha	= require('mocha')
		var Base	= require('mocha/lib/reporters/base')
  		var utils	= require('mocha/lib/utils');

		ponse.writeHead(200, {'Content-Type': 'text/html'});

		ponse.write('<html><body>');
		ponse.write('Shoeboxify Unit Tests');

		var m = new mocha(  { timeout : 5000 }  );
		m.addFile(__dirname + '/handy.test.js');
		m.addFile(__dirname + '/mongo.test.js');
		m.addFile(__dirname + '/s3.test.js');

		m.reporter(Doc2);

		m.run( function done(a) {
			console.log('m.run done with failures: ' + a);
			
			ponse.write('<p> done! </p>');

			ponse.end('</body></html>');
		});

		/* ------------ */

		function Doc2(runner) {
			Base.call(this, runner);

			var		self = this
				,	stats = this.stats
				,	total = runner.total
				,	indents = 2;

			function indent() {
				return Array(indents).join('  ');
			}

			runner.on('suite',
				function(suite){
					if (suite.root) return;
					++indents;
					ponse.write(indent() + '<section class="suite">');
					++indents;
					ponse.write(indent() + '<h1>' + utils.escape(suite.title) + '</h1>');
					ponse.write(indent() + '<dl>');
				} );

			runner.on('suite end',
				function(suite){
					if (suite.root) return;
					ponse.write(indent() + '</dl>');
					--indents;
					ponse.write(indent() + '</section>');
					--indents;
				} );

			runner.on('pass',
				function(test){
					ponse.write(indent() + '  <dt style="color: green;">' + utils.escape(test.title) + ' (' + test.duration +'ms)'+ '</dt>');

				} );

			runner.on('fail',
				function(test){
					ponse.write(indent() + '  <dt style="color: red;">' + utils.escape(test.title) + '</dt>');
					// ponse.write( JSON.stringify(test.error) );

					console.log('test fail:');
					console.log(test);

				} );

		}


	};
