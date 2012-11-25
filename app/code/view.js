
/*
 *		view.js
 */

var 	https	= require('https')
	,	url		= require('url')
	,	path	= require('path')

	,	s3 = require('./s3')
	,	fb = require('./fb')
	,	handy = require('./handy')
	,	debug = require('./debug-lib')
	;

exports.route = {}; 

exports.route.viewObject = '/:uid?_A_F_:photoid?';

exports.viewObject = 
	function(quest, ponse, next) {
		
		if (!quest.params.uid && !quest.params.photoid) {
	        next(); // pass control to the next route handler
	    }
	    else
	    {
	    	console.log('shoeboxify object'+
	    				' uid:'		+ quest.params.uid + 
	    				' photo:'	+ quest.params.photoid );

	    	console.log(quest.url);
	    	
	    	var questUrlElements = url.parse(quest.url);
	    	
	    	var pathname = questUrlElements.pathname;

	    	var objectId = pathname.substring(1, pathname.length );


			var objectURL = s3.object.URL('/json/' + objectId + '.json');

			handy.GET(objectURL 
				,	function success( fileContent )
					{
						ponse.writeHead(200, {'Content-Type': 'text/html'});
						ponse.write('<html><body>');
						
						try {
							ponse.write( debug.JSONtoHTML( fileContent, objectURL ) ) ;
						}
						catch(e)
						{
							ponse.write( fileContent );
						}
	
						ponse.end('</body></html>');
					}
				,	function error() 
					{
						ponse.writeHead(200, {'Content-Type': 'text/html'});
						ponse.write('<html><body>');
						ponse.write( '<h1>Error fetching:</h1>' ) ;
						ponse.write( '<p> ' + objectURL + ' </p>' ) ;
						ponse.end('</body></html>');
					}
				);

			//  ponse.redirect(objectURL);
	    }

	}



