
var url		= require('url')
	, assert= require('assert')
	, email = require("emailjs/email")
	, fb	= require('./fb')
	, debug	= require('../lib/debug-lib')
	, utils	= require('../lib/utils-lib')
	;

/* ================================ EXPORTS ==================================== */

/* ============================================================================= */


function _goToGraph(req, res, path)
{
	res.redirect('/dev/exploreGraph?api=' + utils.ASCIItoBase64(path) );
}

exports.whoami = 
	function(req, res)
	{
		_respondWithGraphInfoPage(req, res, 'me?metadata=1');
	};

exports.testEmail = 
	function(req, res)
	{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<html><body>');

		EmailStarts('<html><body> <h1 style="color: green;">Ciao!</h1> </body></html>');

		res.end('</body></html>');
		
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

exports.checkfriends_OFF = 
	function(req, res)
	{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<html><body>');
		
		fb.batch( ['me', 'me/friends'], req, 
			function(fbObject) {
				res.write( debug.ObjectToHTML( fbObject,  'Batch' ) ) ;

				res.end('</body></html>');
			} )

	
	}

exports.me = 
	function(req, res)
	{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<html><body>');

		res.write( debug.ObjectToHTML(req.session.me, 'req.session.me') ) ;

		res.end('</body></html>');	
	}


exports.checkfriends = 
	function(req, res)
	{
		var path = 'me/friends';

		var finalHTMLMessage = '';

		function ResWrite(string)
		{
			finalHTMLMessage+=string;
			return res.write(string);
		}

		SendTextEmail( 'stats@shoeboxify.com', req.session.me.username + ' checkfriends', req.session.me.link );

		fb.graph( 'me/friends', req, 
			function(fbFriends)
			{
				var friendsInfoArray = fbFriends['data'];

				res.writeHead(200, {'Content-Type': 'text/html'});
				ResWrite('<html><body>');

				ResWrite('<h1>' + req.session.me.name + ' these are your friends photo permissions</h1>');
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

					res.end();


					SendHTMLEmail( req.session.me.email, 'About your friends', finalHTMLMessage );
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
						fb.graph( id + '/photos', req,
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

function _respondWithGraphInfoPage(req, res, graphURL)
{
	fb.graph(graphURL, req, 
		function(fbObject)
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('<html><body>');

			res.write( debug.ObjectToHTML( fbObject,  graphURL ) );

			res.end('</body></html>');
		});
}

exports.exploreGraph = 
	function(req, res)
	{
		var urlElements	  = url.parse(req.url, true);

		// console.log('urlElements: ' + JSON.stringify(urlElements) );

		var queryElements = urlElements['query'];

		if (!queryElements)
			return RespondError('queryElements is null');

		// console.log('queryElements: ' + queryElements ) ;

		var apiCall = queryElements['api'];

		if (!apiCall)
			return RespondError('apiCall is null');

		var graphURL = utils.Base64toASCII(apiCall);

		_respondWithGraphInfoPage(req, res, graphURL);

		function RespondError(e)
		{
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.write('<html><body>');

			res.write('<h1>' + e + '</h1>');

			res.end('</body></html>');
		}
	}


/* ============================================================================= */


exports.myphotos = 
	function(req, res)
	{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<html><body>');

		LoadPhotos( 'me/photos', 10 );


		function LoadPhotos( path, maxDepth)
		{
			if (maxDepth <=0)
			{
				return endResponse();
			}

			fb.graph(path, req, 
				function success(fbObject)
				{
					var data	= fbObject['data'];
					var paging	= fbObject['paging'];
					var next;

					if (paging)
						next = paging['next'];

					WriteIMGwithData(data);

					// res.write('<div>' + next + '</div>\n');
					if (next)
						LoadPhotos( next, maxDepth - 1);
					else
						endResponse();
				},
				function error(e)
				{
					res.write('failed with error: ' + e);

					endResponse();
				}
				);

			function endResponse()
			{
				res.end('</body></html>');
			}

		}

		function WriteIMGwithData(data)
		{			
			AssertArray(data);

			for (var index in data)
			{
				var pictureInfo_i = data[index];

				var pictureURL = pictureInfo_i['picture'];

				res.write('<img src="' + pictureURL + '"></img>\n');
			}
		}
	};

exports.session = 
	function(req, res)
	{
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write('<html><body>');

		res.write( debug.ObjectToHTML( req.session,  'agent.sockets' ) );

		res.end('</body></html>');

	}

function AssertArray(obj)
{
	var objectType = Object.prototype.toString.call( obj );
			
	var isArray = (objectType === '[object Array]');

	assert(isArray, 'object is not an array as expected ' + objectType);
}

