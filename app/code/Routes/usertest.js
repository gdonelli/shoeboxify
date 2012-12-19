/* 

==================[   User test Routes   ]==================

============================================================

*/

var     assert  = require('assert')
	,	url		= require('url')

    ,   a   	= use('a')
    ,   fb  	= use('fb')
    ,   handy 	= use('handy')
	,	common	= use('common')

    ,	authentication	= use('authentication')

	,	User			= use('User')
	,	PhotoManager	= use('PhotoManager')

    ;


var usertest = exports;

usertest.path      = {};
usertest.route     = {};

var basePath = '/test';


// [index]

usertest.path.index = basePath;

usertest.route.index =
    function(quest, ponse)
    {
        handy.routeDebugPage( ponse, usertest, 'User test routes' );
    }

// me

usertest.path.me = basePath + '/me';

usertest.route.me =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<html><body>');
        
        ponse.write( common.objectToHTML(quest.session.user, 'quest.session.user') ) ;

        ponse.end('</body></html>');
    }

// permissions

usertest.path.permissions = basePath + '/permissions';

usertest.route.permissions =
    function(quest, ponse)
    {
        _respondWithGraphInfoPage(quest, ponse, '/me/permissions');
    };

// session

usertest.path.session = basePath + '/session';

usertest.route.session =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<html><body>');
        
        ponse.write( common.objectToHTML(quest.session, 'quest.session') ) ;

        ponse.end('</body></html>');

    }

// exploreGraph

usertest.path.exploreGraph = basePath + '/exploreGraph';

usertest.route.exploreGraph =
    function(quest, ponse)
    {
        var urlElements   = url.parse(quest.url, true);

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


// whoami

usertest.path.whoami = basePath + '/whoami';

usertest.route.whoami =
    function(quest, ponse)
    {
        _respondWithGraphInfoPage(quest, ponse, 'me?metadata=1');
    }


// myphotos

usertest.path.myphotos = basePath + '/myphotos';

usertest.route.myphotos =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<html><body>');

        var user = User.fromRequest(quest);
        var fbAccess = user.getFacebookAccess();

        LoadPhotos( 'me/photos', 100 );     
    
        function LoadPhotos( path, maxDepth)
        {
            if (maxDepth <=0)
            {
                return endResponse();
            }

            fb.graph(
                fbAccess
            ,   path
            ,   function success(fbObject)
                {
                    var data    = fbObject['data'];
                    var paging  = fbObject['paging'];
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
            a.assert_array(data);

            for (var index in data)
            {
                var pictureInfo_i = data[index];

                var pictureURL = pictureInfo_i['picture'];

                ponse.write('<img src="' + pictureURL + '"></img>\n');
            }
        }
    };


// drop

usertest.path.drop = basePath + '/drop';

usertest.route.drop =
    function(quest, ponse)
    {
        ponse.render('drop');
    }


// shoeboxified

usertest.path.shoeboxified = basePath + '/shoeboxified';

usertest.route.shoeboxified =
    function(quest, ponse)
    {
        var photoManager = PhotoManager.fromRequest(quest);
        
        ponse.writeHead(200, {'Content-Type': 'text/html'});
        ponse.write('<html><body>');
        
        photoManager.getPhotos(
                function success(photos)
                {
                    ponse.write(common.objectToHTML(photos, 'photoManager.getPhotos'));
                    ponse.end('</body></html>');
                }
            ,	function error(e)
                {
                    ponse.write(common.objectToHTML(e, graphURL));
                    ponse.end('</body></html>');
                } );
        
    }



/* ======== */
/* aux ==== */
/* ======== */


function _goToGraph(quest, ponse, path)
{
    ponse.redirect( usertest.path.exploreGraph + '?api=' + handy.ASCIItoBase64(path) );
}

function _respondWithGraphInfoPage(quest, ponse, graphURL)
{
    var user = User.fromRequest(quest);
    var fbAccess = user.getFacebookAccess();
    
    fb.graph(
    		fbAccess
    	,	graphURL
        ,	function success(fbObject)
            {
                if ( !authentication.sanitizeObject(quest, ponse, fbObject) )
                    return;

                ponse.writeHead(200, {'Content-Type': 'text/html'});
                ponse.write('<html><body>');
                ponse.write(common.objectToHTML(fbObject, graphURL));
                ponse.end('</body></html>');
            }
        ,	function fail(error)
            {
                console.log('_respondWithGraphInfoPage - error:' + error);

                return;
            } );
}

