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


var     assert  = require('assert')
    ,   https   = require('https')
    ,   url     = require('url')
    ,   path    = require('path')
    ,   _       = require('underscore')
    
    ,   a       = use('a')
    ,   fb      = use('fb')
    ,   fbutil  = use('fbutil')
    ,   handy   = use('handy')
    ,   memento = use('memento')

    ,	authentication = use('authentication')

    ,   User = use('User')
    ,   FacebookAccess	= use('FacebookAccess')
    ,   PhotoManager 	= use('PhotoManager')

    ;

var service = exports;

service.path  = {}; 
service.route = {}; 

/* ====================================================== */
/* ====================================================== */
/* ====================[   Routes   ]==================== */
/* ====================================================== */
/* ====================================================== */

/*  API:    objectForURL
 *  URL:    /o4u
 *  args:   ?u=<url>
 *
 *  example: /o4u?u=https://www.facebook...
 *
 *  returns json:
 *      {
 *          status:   0 -> success
 *                    1 -> malformed request
 *                    2 -> Failed to look up Facebook Object
 *                  403 -> User not logged-in in Shoeboxify
 *
 *          error: <error_string>
 *
 *          fb_object: <the facebook object found>
 *          
 *          placeholder: <placeholder for facebook object>
 *          
 *          source: <string used as look up source>
 *      }
 */

service.path.facebookObjectForURL = '/service/facebookObjectForURL';

service.route.facebookObjectForURL = 
    function(quest, ponse)
    {
        _sevice_processInputURL(quest, ponse, 
            function(input, exit_f)
            {
                a.assert_def(input);
                a.assert_f(exit_f);

                service.facebookObjectForURL(
                        FacebookAccess.fromRequest(quest)
                    ,   input
                    ,   function success(o) {
                            exit_f({     status: 0
                                ,   fb_object: o
                                ,      source: input   
                            });
                        }
                    ,   function placeholder(p) {
                            exit_f({       status: 0
                                ,   placeholder: p
                                ,        source: input   
                            });
                        }
                    ,   function error(e) {
                            exit_f({  status: (e.code ? e.code : 2)
                                ,    error: 'objectForURL failed: ' + e.message
                                ,   source: input   
                            });
                        } );

            });
    }

service.O_AUTH_ERROR_CODE = 190;

service.facebookObjectForURL = 
    function(   fbAccess
            ,   inputURL
            ,   object_f        /* (fb_object) */
            ,   placeholder_f   /* (placeholder_object) */
            ,   error_f         /* (e) */
            )
    {
        FacebookAccess.assert(fbAccess);
        a.assert_def(inputURL);
        a.assert_f(object_f);
        a.assert_f(placeholder_f);
        a.assert_f(error_f);

        var fbId =  fbutil.facebookIdForURL(inputURL);

        if (!fbId)
            return error_f( new Error('Cannot find facebook object from URL') );

        fb.graph(
                fbAccess
            ,   fbId
            ,   function success(fbObject)
                {
                    object_f(fbObject);
                }
            ,   function error(e)
                {
                    if (e.type == "OAuthException")
                    {
                        error_f(e);
                    }
                    else if (e.type == "GraphMethodException")
                    {
                        // Assume we have a valid & legit facebook ID 
                        // but we don't have permission to access it

                        var placeholder = {}; 
                        placeholder.id = fbId;

                        placeholder.error = e;

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
                        error_f(e);
                    }
                } );

    };


/*  API:    shoeboxifyURL
 *  URL:    /service/shoeboxifyURL
 *  args:   ?u=<url>
 *
 *  example: /service/shoeboxifyURL?u=https://www.facebook...
 *
 */

service.path.shoeboxifyURL = '/service/shoeboxifyURL';

service.route.shoeboxifyURL =
    function(quest, ponse)
    {
        _sevice_processInputURL(quest, ponse, 
            function(inputURL, exit_f)
            {
                var user = User.fromRequest(quest);

                service.shoeboxifyURL(
						user
                    ,   inputURL
                    ,   function success(r, options)
                        {
                            exit_f({    status: 0
                                    ,   source: inputURL
                                    ,     data: r });
                        }
                    ,   function error(e)
                        {
                            exit_f({    status: 1
                                    ,   source: inputURL
                                    ,    error: 'shoeboxifyURL failed ' + e });             
                        } );
            } );
    };


service.shoeboxifyURL =
    function(user, theURL, success_f /* (entry, meta) */, error_f  /* (error) */ )
    {
        a.assert_http_url(theURL);
        a.assert_f(success_f);
        a.assert_f(error_f);
        
        var photoManager = new PhotoManager(user);
        
        photoManager.addPhotoFromURL(
                theURL
            ,   function success(r, options) {
                    success_f(r, options); 
                }
            ,   function error(e) { 
                    error_f(e); 
                } );
    };


// TODO...
// service.path.shoeboxifyFile = '/service/shoeboxifyFile';


/*  API:    Copy Object
 *  URL:    /cp
 *  args:   ?u=<url>
 *
 *  example: /cp?u=https://www.facebook...
 *
 *  returns json:
 *      {
 *          status:   0 -> success
 *      }
 */

service.path.shoeboxifyFacebookObject = '/service/shoeboxifyFB';

service.route.shoeboxifyFacebookObject =
    function(quest, ponse)
    {
        _sevice_processInputURL(quest, ponse, 
            function(input, exit_f)
            {
                var fbId =  memento.facebookIdForURL(input);

                if (fbId)
                {
                    var user = User.fromRequest(quest);

                    service.shoeboxifyFacebookObject(
                            user.getFacebookAccess()
                        ,   user.getFacebookId()
                        ,   fbId
                        ,   function success(r, options)
                            {
                                exit_f({    status: 0
                                        ,   source: input
                                        ,     data: r });
                            }
                        ,   function error(e)
                            {
                                exit_f({    status: 1
                                        ,   source: input
                                        ,    error: 'copyObject failed ' + e });                
                            } );
                }
                else
                    exit_f('Cannot copy Facebook object from URL');
            } );
    };


service.shoeboxifyFacebookObject =
    function(fbAccess, userId, fbId, success_f /* (entry, meta) */, error_f  /* (error) */ )
    {
        FacebookAccess.assert(fbAccess);
        a.assert_uid(userId);
        a.assert_fbId(fbId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        memento.addFacebookObject(  fbAccess
                                ,   userId
                                ,   fbId
                                ,   function success(r, options) {
                                        success_f(r, options);
                                    }
                                ,   function error(e) {
                                        error_f(e);
                                    } );

    }

/*
    process_f (input, exit_f)

    should pass to exit_f something like:
        {
            status: 0 (succcess) | > 0 (error)
        ,   source: url...
        ,     data: <something>
        }
*/

function _sevice_processInputURL(   quest
                                ,   ponse
                                ,   process_f /* (input, exit_f) */
                                )
{
    a.assert_def(quest);
    a.assert_def(ponse);
    a.assert_f(process_f);

    var startDate = new Date();

    var urlElements = url.parse(quest.url, true);
    var urlQuery = urlElements['query'];

    ponse.writeHead(200, { 'Content-Type': 'application/json' } );

    // console.log(quest.url);

    var jsonResult;

    if ( !urlQuery || urlQuery['u'].length <= 0 )
    {
        _exit({     status: 1
                ,   source: quest.url
                ,    error: 'malformed request ?u= is empty'
            });

        console.error('urlQuery is malformed');

        return;
    }

    var input = urlQuery['u'];

    if ( !authentication.isUserRequest(quest) )
    {
        _exit({ status: 403
            ,   source: input
            ,   error:  'User is not logged-in'
            });
    }
    else
    {
        process_f(input, _exit);
    }

    /* ======================================= */

    function _exit(result)
    {
        a.assert_def(result);
        a.assert_obj(result);
 
        if (result.meta == undefined)
            result.meta = {};
       
        result.meta.time = handy.elapsedTimeSince(startDate);

        ponse.end( JSON.stringify(result) );
    }
    
}
