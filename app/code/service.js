/* 

==================[   /service/...   ]==================

Routes:
			service.route.facebookObjectForURL
			service.route.shoeboxifyFacebookObject
			service.route.shoeboxifyURL

API:
			service.facebookObjectForURL
			
====================================================

*/


var 	assert	= require('assert')
	,	https	= require('https')
	,	url		= require('url')
	,	path	= require('path')
	,	_		= require('underscore')
	
	,	fb		= require('./fb')
	,	handy	= require('./handy')
	,	memento	= require('./memento')
	;

var service = exports;

service.path  = {}; 
service.route = {}; 

/* ====================================================== */
/* ====================================================== */
/* ====================[   Routes   ]==================== */
/* ====================================================== */
/* ====================================================== */

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

service.path.facebookObjectForURL = '/service/facebookObjectForURL';

service.route.facebookObjectForURL = 
	function(quest, ponse)
	{
		_sevice_processInputURL(quest, ponse, 
			function(input, exit)
			{
				service.facebookObjectForURL(quest, input
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

service.facebookObjectForURL = 
	function(	quest
			,	inputURL
			,	object_f		/* (fb_object) */
			,	placeholder_f	/* (placeholder_object) */
			,	error_f			/* (errString) */
			)
	{
		assert( quest 			!= undefined,	'quest is undefined');
		assert( quest.session 	!= undefined,	'quest.session is undefined');
		assert( object_f 		!= undefined,	'object_f is undefined');
		assert( placeholder_f	!= undefined,	'placeholder_f is undefined');
		assert( error_f 		!= undefined,	'error_f is undefined');

		var fbID =  memento.facebookIdForURL(inputURL);

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

							var extension = path.extname(inputURL);
							if (extension == '.jpg' || 
								extension == '.jpeg' || 
								extension == '.png') 
							{
								placeholder.source = inputURL;
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


/*	API:	shoeboxifyURL
 *	URL:	/service/shoeboxifyURL
 *	args:	?u=<url>
 *
 *	example: /service/shoeboxifyURL?u=https://www.facebook...
 *
 */

service.path.shoeboxifyURL = '/service/shoeboxifyURL';

service.route.shoeboxifyURL =
	function(quest, ponse)
	{
		_sevice_processInputURL(quest, ponse, 
			function(inputURL, exit_f)
			{
				service.shoeboxifyURL(quest, inputURL
					,	function success(r, options)
						{
							exit_f({	status: 0
									,	source: inputURL
									,	  data: r });
						}
					,	function error(e)
						{
							exit_f({	status: 1
									,	source: inputURL
									,	 error: 'shoeboxifyURL failed ' + e });				
						} );
			} );
	};


service.shoeboxifyURL =
	function(quest, theURL, success_f /* (entry, meta) */, error_f  /* (error) */ )
	{
		assert(quest != undefined, 'quest is undefined');
		assert(theURL != undefined, 'theURL is undefined');

		memento.addFromURL(	fb.me(quest, 'id'), theURL, quest
						,	function success(r, options)
							{
								// console.log( 'memento.addFacebookObject took: ' + options.time + 'ms' );

								if (success_f)
									success_f(r, options);
							}
						,	function error(e)
							{
								if (error_f)
									error_f(e);
							} );
	};




// TODO...
// service.path.shoeboxifyFile = '/service/shoeboxifyFile';


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

service.path.shoeboxifyFacebookObject = '/service/shoeboxifyFB';

service.route.shoeboxifyFacebookObject =
	function(quest, ponse)
	{
		_sevice_processInputURL(quest, ponse, 
			function(input, exit_f)
			{
				var fbID =  memento.facebookIdForURL(input);

				if (fbID)
				{
					service.shoeboxifyFacebookObject(quest, fbID
						,	function success(r, options)
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


service.shoeboxifyFacebookObject =
	function(quest, fbID, success_f /* (entry, meta) */, error_f  /* (error) */ )
	{
		assert(quest != undefined, 'quest is undefined');
		assert(fbID != undefined, 'fbID is undefined');

		memento.addFacebookObject(	fb.me(quest, 'id'), fbID, quest
								,	function success(r, options)
									{
										// console.log( 'memento.addFacebookObject took: ' + options.time + 'ms' );

										if (success_f)
											success_f(r, options);
									}
								,	function error(e)
									{
										if (error_f)
											error_f(e);
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

function _sevice_processInputURL(	quest
								,	ponse
								,	process_f /* (input, exit_f) */
								)
{
	assert(process_f != undefined, 'processObjectF undefined');
	var startDate = new Date();

	var urlElements = url.parse(quest.url, true);
	var urlQuery = urlElements['query'];

	ponse.writeHead(200, { 'Content-Type': 'application/json' } );

	console.log(quest.url);

	var jsonResult;

	if ( !urlQuery || urlQuery['u'].length <= 0 )
	{
		_exit({		status: 1
				,   source: quest.url
				,	 error: 'malformed request ?u= is empty'
			});

		console.error('urlQuery is malformed');

		return;
	}

	var input = urlQuery['u'];

	if ( !fb.isAuthenticated(quest) )
	{
		_exit({		status: 403
				,   source: input
				,	 error: 'User is not logged-in'
			});
	}
	else
	{
		// console.log(urlQuery);
		
		process_f(input, _exit);
	}

	/* ======================================= */

	function _exit(result)
	{
		assert(result != undefined, 'exiting with undefined result');
		assert(_.isObject(result), 'exit result expected to be an object is: ' + result);

		if (result.meta == undefined)
			result.meta = {};

		// console.log('result:');
		// console.log(result);

		// console.log('result.meta:');
		// console.log(result.meta);
		
		// if (result.meta)
		
		result.meta.time = handy.elapsedTimeSince(startDate);

		ponse.end( JSON.stringify(result) );
	}
	
}
