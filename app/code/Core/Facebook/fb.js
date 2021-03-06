/* 

==================[   Facebook API   ]==================

            fb.get    Facebook Graph API
            fb.batch    Batch Graph API requests
            
========================================================


*/

var     assert  = require('assert')
    ,   https   = require('https')
    ,   url     = require('url')   

    ,   a = use('a')
    ,   FacebookAccess  = use('FacebookAccess')
    ;


var fb = exports;


fb.get =
    function( fbAccess, path, callback /* (err, fbObject) */ )
    {
        return fb.graphAPI( fbAccess, 'GET', path, callback );
    };


fb.batch =
    function( fbAccess, paths, callback /* (err, fbObject) */ )
    {
        a.assert_f(callback);
        FacebookAccess.assert(fbAccess);

        var options = {
                host:       'graph.facebook.com'
            ,   method:     'POST'
        };

        var batchAPI = [];

        for (var i in paths)
            batchAPI.push( { "method":"GET", "relative_url":paths[i] } );

        var outQuest = https.request(options,
            function (outPonse)
            {
                var str = '';
                outPonse.on('data',
                    function (chunk) {
                        str += chunk;
                    } );

                outPonse.on('end',
                    function () {
                        callback(null, JSON.parse(str));
                    } );
            });

        // the data to POST needs to be a string or a buffer
        outQuest.write( 'access_token=' + fbAccess.getToken() );
        outQuest.write( '&' );
        outQuest.write( 'batch=' + JSON.stringify(batchAPI) ) ;
        
        outQuest.end();
    };


/* aux === */

fb.graphAPI = 
    function (fbAccess, method, path, callback /* (err, fbObject) */ )
    {
        a.assert_f(callback);
        FacebookAccess.assert(fbAccess);

        var questOptions = { method: method };

        // This is full URL graph request
        if (path.startsWith('http'))
        {
            var urlElements = url.parse(path);

            questOptions['hostname']    = urlElements['hostname'];
            questOptions['path']        = urlElements['path'];
        }
        else
        {
            // if there is no leading / we will add it
            var questPath = ( path.startsWith('/') ? '' : '/');
            questPath += path;
            questPath += (path.indexOf('?') < 0 ? '?' : '&');
            questPath += 'access_token='+ fbAccess.getToken();

            questOptions.hostname   = 'graph.facebook.com';
            questOptions.path       = questPath;
        }

        // console.log('questOptions: ' + JSON.stringify(questOptions) );

        var apiQuest = https.request( questOptions, _processGraphResponse );

        _setupErrorHander(apiQuest);

        apiQuest.end();
        
        /* ============================== */

        function _setupErrorHander(apiQuest)
        {
            apiQuest.on('error', 
                function(e)
                {
                    console.error('**** ERROR: Graph Request Failed for path: ' + path + " err:" + e);

                    callback(e);
                });         
        }

        function _processGraphResponse(apiQuest)
        {
            var bufferString = '';

            apiQuest.on('data',
                function (chunk) {
                    bufferString += chunk;
                } );

            apiQuest.on('end',
                function () {
                    try
                    {
                        var jsonObject = JSON.parse(bufferString);

                        if (jsonObject.error)
                        {
                            var err;
                            if (jsonObject.error.message)
                            {
                            	err = new Error(jsonObject.error.message);
                            }
                            else
                                err = new Error('fb api failed');
                        
                            err.type = jsonObject.error.type;
                            err.code = jsonObject.error.code;

                            callback(err);
                        }
                        else
                        {
                            callback(null, jsonObject);
                        }
                    }
                    catch(e)
                    {
                        console.error('**** Caught exception while processing Graph response');
                        console.error('**** Exception:' + e);

                        console.error('**** Stacktrace:');
                        console.error(e.stack);

                        console.error('**** Buffer String:');
                        var bufferToShow = (bufferString.length > 256 ? bufferString.substring(0, 256) : bufferString );

                        console.error('**** ' + bufferToShow + '...');
                        
                        callback(e);
                    }
                } );
        }
    };


