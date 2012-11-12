
/*
 *		Service API
 */

var 	https	= require('https')
	,	url		= require('url')
	,	path	= require('path')
	,	assert	= require('assert')

	,	s3 = require('./s3')
	,	fb = require('./fb')

	,	shoebox		= require('./shoebox')
	,	shoeboxify	= require('./shoeboxify')
	, 	StringExtension = require('./String-extension')
	;



exports.path  = {}; 
exports.route = {}; 

/*	API:	objectForURL
 *	URL:	/o4u
 *	args:	?u=<url>
 *
 *	example: /o4u?u=https://www.facebook...
 *
 * 	returns json:
 *		{
 *			status:	  0 -> success
 *					  1 -> malformed request
 *					  2 -> Failed to look up Facebook Object
 *					403 -> User not logged-in in Shoeboxify
 *
 *			error: <error_string>
 *
 *			fb_object: <the facebook object found>
 *			
 *			placeholder: <placeholder for facebook object>
 *			
 *			source: <string used as look up source>
 *		}
 */

exports.path.objectForURL = '/o4u';

exports.route.objectForURL = 
	function(quest, ponse)
	{
		_sevice_processInputURL(quest, ponse, 
			function(input, exit)
			{
				exports.objectForURL(quest, input
					,	function success(o){
							exit({		status: 0
									,	fb_object: o
									,	source: input	} );

						}
					,	function placeholder(p){
							exit({		status: 0
									,	placeholder: p
									,	source: input	} );

						}
					,	function error(e) {
							exit({		status: 2
									,	error : 'objectForURL failed: ' + e
									,	source: input	} );

						} );

			});
	}

exports.objectForURL = 
	function(	quest, string
			,	object_f		/* (fb_object) */
			,	placeholder_f	/* (placeholder_object) */
			,	error_f 		/* (errString) */	)
	{
		assert( quest 			!= undefined,	'quest is undefined');
		assert( quest.session 	!= undefined,	'quest.session is undefined');
		assert( object_f 		!= undefined,	'object_f is undefined');
		assert( placeholder_f	!= undefined,	'placeholder_f is undefined');
		assert( error_f 		!= undefined,	'error_f is undefined');

		var fbID =  exports.facebookIDForURL(string);

		if (fbID)
			return _facebook_lookup(fbID);
		else
			error_f('cannot find facebook object from URL');

		/* =============================== */

		function _facebook_lookup(fbID)
		{
			if (fbID)
			{
				fb.graph( fbID, quest,
					function success(fbObject)
					{
						if (fbObject.error)
						{
							// Let's be defensive. Assume we have a valid & legit 
							// facebook ID but we don't have permission to access it

							if (fbObject.error.type == "GraphMethodException" && fbObject.error.code == 100) {
								// Permission denied to look up the element (most likely)							
							}

							var placeholder = {}; 
							placeholder.id = fbID;

							var extension = path.extname(string);
							if (extension == '.jpg' || 
								extension == '.jpeg' || 
								extension == '.png') 
							{
								placeholder.source = { source : string };
							}

							placeholder_f(placeholder);
						}
						else
						{
							object_f(fbObject);
						} 

					},
					function error(e)
					{
						error_f('Failed to lookup: ' + fbID + ' error:' + error);
					} );
			}
		}
	}


/*	API:	Copy Object
 *	URL:	/cp
 *	args:	?u=<url>
 *
 *	example: /cp?u=https://www.facebook...
 *
 * 	returns json:
 *		{
 *			status:	  0 -> success
 *		}
 */

exports.path.copyObject = '/cp';

exports.route.copyObject =
	function(quest, ponse)
	{
		_sevice_processInputURL(quest, ponse, 
			function(input, exit_f)
			{
				var fbID =  exports.facebookIDForURL(input);

				if (fbID)
				{
					exports.copyObject(quest, fbID
						,	function success(r)
							{
								exit_f({	status: 0
										,	source: input
										,	  data: r });
							}
						,	function error(e)
							{
								exit_f({	status: 1
										,	source: input
										,	 error: 'copyObject failed ' + e });				
							} );
				}
				else
					exit_f('Cannot copy Facebook object from URL');
			} );
	};


exports.copyObject =
	function(quest, fbID, successF, errorF)
	{
		assert(quest != undefined, 'quest is undefined');
		assert(fbID != undefined, 'fbID is undefined');

		shoebox.add(fbID, fb.me(quest, 'id'), quest 
					,	function success(r)
						{
							if (successF)
								successF(r);
						}
					,	function error(e)
						{
							if (errorF)
								errorF(e);
						} );

	}

/*
	process_f (input, exit_f)

	should pass to exit_f something like:
		{
			status: 0 (succcess) | > 0 (error)
		,	source: url...
		,	  data: <something>
		}
*/
function _sevice_processInputURL(quest, ponse, process_f)
{
	assert(process_f != undefined, 'processObjectF undefined');

	var urlElements = url.parse(quest.url, true);
	var urlQuery = urlElements['query'];

	ponse.writeHead(200, { 'Content-Type': 'application/json' } );

	shoeboxify.debug(quest.url);

	var jsonResult;

	if ( !urlQuery || urlQuery['u'].length <= 0 )
	{
		_exit({		status: 1
				,   source: quest.url
				,	 error: 'malformed request ?u= is empty'
			});

		shoeboxify.error('urlQuery is malformed');

		return;
	}

	var input = urlQuery['u'];

	if ( !fb.isAuthenticated(quest) )
	{
		_exit({		status: 403
				,   source: input
				,	 error: 'User not logged-in in Shoeboxify'
			});
	}
	else
	{
		shoeboxify.log(urlQuery);
		
		process_f(input, _exit);
	}

	/* ======================================= */

	function _exit(result)
	{
		ponse.end( JSON.stringify(result) );
	}
	
}


/* ======================================================== */
/* ======================================================== */
/* ======================================================== */

/*
 * Will extract the facebook ID from a URL if present
 * returns undefined if none is found.
 */
exports.facebookIDForURL =
	function( srcString )
	{
		if (srcString.startsWith('http'))
		{
			// https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf

			if (srcString.indexOf('photo.php?') > 0 && srcString.indexOf('fbid=') > 0 )
			{
				var stringElements = url.parse(srcString, true);
				var stringQuery = stringElements['query'];
				var fbid = stringQuery['fbid'];

				return fbid;
			}

			// https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg
			
			var last4chars = srcString.substring((srcString.length-4), srcString.length );

			if ( last4chars == '.jpg')
			{
				var srcStringSpliyElements = srcString.split('/');

				var lastPathComponent = srcStringSpliyElements[srcStringSpliyElements.length-1];

				var numbers = lastPathComponent.split('_');

				var canditateResult = numbers[1];

				var isnum = /^\d+$/.test(canditateResult);

				if (isnum)
					return canditateResult;
			}
		}

		return undefined;
	}


