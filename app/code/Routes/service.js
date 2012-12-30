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

    ,	authentication = use('authentication')

    ,   User    = use('User')
    ,   Photo   = use('Photo')
    ,   FacebookAccess  = use('FacebookAccess')
    ,   PhotoManager 	= use('PhotoManager')

    ;

var service = exports;

service.path  = {}; 
service.route = {};

service.event  = {};
service.socket = {};


/* 
 *  data:   { url: <url> }
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

service.event.getFacebookObjectForURL = 'service.getFacebookObjectForURL';

service.socket.getFacebookObjectForURL =
    function(socket, inputData /* { url:... } */, next /* (data) */)
    {
        a.assert_def(socket, 'socket');
        a.assert_def(inputData, 'inputData');
        a.assert_f(next, 'next');
        var inputURL = inputData['url'];
        a.assert_def(inputURL, 'inputURL');
        
        service.getFacebookObjectForURL(
                User.fromSocket(socket).getFacebookAccess()
            ,   inputURL
            ,   function success(o) {
                    next({     status: 0
                        ,   fb_object: o
                        ,      source: inputURL   
                    });
                }
            ,   function placeholder(p) {
                    next({       status: 0
                        ,   placeholder: p
                        ,        source: inputURL   
                    });
                }
            ,   function error(e) {
                    next({  status: (e.code ? e.code : 2)
                        ,    error: 'objectForURL failed: ' + e.message
                        ,   source: inputURL   
                    });
                } );

    }

service.O_AUTH_ERROR_CODE = 190;

service.getFacebookObjectForURL = 
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

        fb.get(fbAccess, fbId,
            function success(err, fbObject)
            {
                if(err)
                {
                    if (err.type == "OAuthException")
                    {
                        error_f(err);
                    }
                    else if (err.type == "GraphMethodException")
                    {
                        // Assume we have a valid & legit facebook ID 
                        // but we don't have permission to access it

                        var placeholder = {}; 
                        placeholder.id = fbId;

                        placeholder.error = err;

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
                        error_f(err);
                    }
                }
                else
                    object_f(fbObject);
            });

    };



service.event.shoeboxifyURL = 'service.shoeboxifyURL';


function _forwardProgressEvents(queue, inputData)
{
    // Emit progess with a given event name
    if (inputData.progressEvent) {
        queue.on('progress',
            function(progressData) {
                socket.volatile.emit(inputData.progressEvent, progressData);
            });
    }
}


service.socket.shoeboxifyURL =
    function(socket, inputData /* { url:... } */, next /* (data) */)
    {
        a.assert_def(socket, 'socket');
        a.assert_def(inputData, 'inputData');
        a.assert_f(next, 'next');
        var inputURL = inputData['url'];
        a.assert_def(inputURL, 'inputURL');
        
        var user = User.fromSocket(socket);
        var photoManager = new PhotoManager(user);
        
        var q = photoManager.addPhotoFromURL(inputURL,
            function(err, photo) {
                if (err) {
                    next({  status: 1
                        ,   source: inputURL
                        ,   error:  'shoeboxifyURL failed: ' + err.message } );
                }
                else {
                    next({  status: 0
                        ,   source: inputURL
                        ,   data:   photo   } );
                }
            });
        
        _forwardProgressEvents(q, inputData);
    };



service.event.removePhoto = 'service.removePhoto';

service.socket.removePhoto =
    function(socket, inputData /* { photoId:... } */, next /* (data) */ )
    {
        a.assert_def(socket, 'socket');
        a.assert_def(inputData, 'inputData');
        a.assert_f(next, 'next');
        var photoId = inputData['photoId'];
        a.assert_def(photoId, 'photoId');
        
        var photoToRemove = new Photo(photoId);
        
        var q = photoManager.removePhoto(photoToRemove,
            function(err, photo) {
                if (err) {
                    next({  status: 1
                        ,   source: photoId
                        ,   error:  'removePhoto failed: ' + err.message } );
                }
                else {
                    next({  status: 0
                        ,   source: photoId
                         } );
                }
            });
        
        _forwardProgressEvents(q, inputData);
    }

