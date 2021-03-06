/* 

==================[   Facebook Login   ]==================

*/


var     https       = require('https')
    ,   querystring = require('querystring')
    ,   md5         = require('MD5')
    ,   url         = require('url')
    ,   assert      = require('assert')
    ,   _           = require('underscore')

    ,   a           = use('a')
    ,   fb          = use('fb')
    ,   handy       = use('handy')
    ,   httpx       = use('httpx')
    ,   identity    = use('identity')

    ,   OperationQueue  = use('OperationQueue')
    ,   FacebookAccess  = use('FacebookAccess')
    ,   User            = use('User')
    ;

var authentication = exports;

authentication.route  = {};
authentication.path   = {};
authentication.auth   = {};
//
//  Begin Facebook Login
//

authentication.path.login = '/login';

authentication.route.login = 
    function(quest, ponse)
    {
        a.assert_def(quest.url);
        
        var urlElements = url.parse(quest.url, true);
        var stateObject = { id: md5( Math.random() ) };
        
        if (urlElements['query'])
        {
            var sourceURL = urlElements['query']['source'];
            if (sourceURL && sourceURL.length > 1)
                stateObject['source'] = sourceURL;
        }

        var state = JSON.stringify(stateObject);

        quest.session.loginState = state;

        var query = {
                  'client_id'       : identity.appID()
                , 'redirect_uri'    : _dialogRedirectURL(quest)
                , 'scope'           : identity.appPermissions()
                , 'state'           : state
            };

        var fbAuthURL = 'https://www.facebook.com/dialog/oauth?' + querystring.stringify(query);

        ponse.redirect(fbAuthURL);
    };

//
// Facebook Authentication Callback Page
//

authentication.path.loginResponse = '/fb-login-response';

authentication.route.loginResponse = 
    function(quest, ponse)
    {
        var q = new OperationQueue(1);
        q.context = {};

        q.on('abort',
            function(e) {
                handy.logErrorStacktrace(e);
                _respondWithError(quest, ponse, 'Login Error', e);
            });

        // Read URL query
        //          -> q.context.code
        //          -> q.context.source
        q.add(
            function ReadURLQueryOperation(doneOp)
            {
                var urlElements   = url.parse( quest.url, true );
                var queryElements = urlElements.query;

                // error?
                var queryErrorStr = queryElements.error;
                if (queryErrorStr)
                    return q.abort(new Error(queryErrorStr));
              
                // code
                q.context.code = queryElements.code;

                // Get state
                var state = queryElements.state;
                if (state) {
                    var stateObject = JSON.parse(state);
                    var sourceInState = stateObject.source;

                    if (sourceInState)
                        q.context.source = handy.Base64toASCII(sourceInState);

                    console.log('q.context.source: ' + q.context.source);
                }

                doneOp();
            });


        // Get access token Operation
        //          -> q.context.token
        //          -> q.context.expires
        q.add(
            function GetAccessTokenOperation(doneOp)
            {
                a.assert_def(q.context.code);

                var query = {
                      'code'            : q.context.code
                    , 'client_id'       : identity.appID()
                    , 'client_secret'   : identity.appSecret()
                    , 'redirect_uri'    : _dialogRedirectURL(quest)
                    
                };

                var oAuthURL = 'https://graph.facebook.com/oauth/access_token?'+ querystring.stringify(query);

                httpx.GET(  oAuthURL
                        ,   function _200OK(read_s, ponse) 
                            {
                                var bufferElements  = url.parse('?'+read_s, true);
                                q.context.token     = bufferElements['query']['access_token'];
                                q.context.expires   = bufferElements['query']['expires'];
                                doneOp();
                            }
                        ,   function otherResponse(ponse)
                            {
                                var abortError = new Error('GetAccessTokenOperation: OAuth failed: ' + ponse.readBuffer);
                                abortError.response = ponse;

                                // console.log(  );
                                
                                q.abort(abortError);
                            }
                        ,   function error(error)
                            {
                                var abortError = new Error('GetAccessTokenOperation: GET oAuth error');
                                abortError.source = error;
                                q.abort(abortError);
                            } );
            } );

        // Start User session
        //          -> q.context.user
        //
        q.add(
            function StartUserSessionOperation(doneOp)
            {
                a.assert_def(q.context.token);
                a.assert_def(q.context.expires);

                assert(q.context.token.length   > 5, 'token is short');
                assert(q.context.expires.length >= 2, 'expires is short');
                                
                console.log('  token: ' + q.context.token);
                console.log('expires: ' + q.context.expires);

                var fbAcccess = new FacebookAccess(q.context.token, q.context.expires);
                
                new User(fbAcccess,
                    function(err, user) {
                        if (err)
                            return q.abort(err);
                         
                        q.context.user = user;
                        doneOp();
                    });

            });

        //
        // User Session Initialization
        //          -> quest.session.user
        q.add(
            function SessionInitOperation(doneOp)
            {
                User.assert(q.context.user);

                quest.session.regenerate(
                    function (err) {
                        if (err)
                        {
                            q.abort(err);
                        }
                        else
                        {
                            quest.session.cookie.maxAge = Math.floor(q.context.expires) * 1000;
                            quest.session.user = q.context.user;
                            doneOp();
                        }
                    });
            });

        //
        // Send response back
        //
        q.add(
            function EndOperation(doneOp)
            {
                if (q.context.source)
                    ponse.redirect(q.context.source);
                else
                    _respondWithLoginSuccess(quest, ponse);

                doneOp();
            });
    };


function _isShoeboxifyTool(quest)
{
    return (quest.headers['user-agent'] == 'com.shoeboxify.tool');
}

function _respondWithLoginSuccess(quest, ponse)
{
    if ( _isShoeboxifyTool(quest) )
        return _respondWithJSONSuccess(quest, ponse);
    else
        return _respondWithHTMLSuccess(quest, ponse);
    
    /* aux ==== */
    
    function _respondWithJSONSuccess(quest, ponse)
    {
        ponse.writeHead( 200, { 'Content-Type': 'application/json' } );
        
        var fbAcccess = quest.session.user.getFacebookAccess();

        var object = {  'accessToken'   : fbAcccess.getToken(),
                        'expires'       : fbAcccess.getExpires()   };

        ponse.end( JSON.stringify(object) );    
    }

    function _respondWithHTMLSuccess(quest, ponse)
    {
        var title = /* quest.session.me.name + */'Login Successful';

        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');

        ponse.write('<head>');
        ponse.write('<title>' + title + '</title>');
        ponse.write('</head>');

        ponse.write('<body>');
        ponse.write('<h1>' + title + '</h1>');

        var fbAcccess = quest.session.user.getFacebookAccess();

        ponse.write('<p><strong>accessToken: </strong>' + fbAcccess.getToken() + '</p>');
        ponse.write('<p><strong>expires: </strong>'     + fbAcccess.getExpires() + 
                    ' seconds (' + Math.round( fbAcccess.getExpires()/(60*60*24) ) + ' days)</p>');

        ponse.write('</body>');
        
        ponse.end('</html>');
    }
}


function _respondWithError(quest, ponse, title, e)
{
    if ( _isShoeboxifyTool(quest) )
        return _respondWithJSONError(quest, ponse, title, e);
    else
        return _respondWithHTMLError(quest, ponse, title, e);
    
    /* aux ==== */
    
    function _respondWithJSONError(quest, ponse, title, e)
    {
        console.error('Login: ' + e);

        ponse.writeHead( 200, { 'Content-Type': 'application/json' } );

        var responseObject = {};

        responseObject.message = title;
        responseObject.error = e;
        
        ponse.end( JSON.stringify(responseObject) );
    }

    function _respondWithHTMLError(quest, ponse, title, e)
    {
        console.error('Login: ' + e);

        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');

        ponse.write('<head>');
        ponse.write('<title>' + title + '</title>');
        ponse.write('</head>');

        ponse.write('<body>');
        ponse.write('<h1>' + title + '</h1>');
        ponse.write('<p>' + e + '</p>');

        ponse.write('<code>');
        handy.writeErrorStacktraceToHTMLStream(ponse, e);
        ponse.write('</code>');
        
        ponse.write('<p style="color:red">Please report this error at error[at]shoeboxify.com</p>');
        ponse.write('</body>');
        
        ponse.end('</html>');
    }
}

function _dialogRedirectURL(quest)
{
    var questHeaders = quest.headers;
    var questHost    = questHeaders.host;
    
    return 'http://' + questHost + authentication.path.loginResponse;
}

function _dictionaryWithOnlyKeys(sourceDictionary, keyArray)
{
    var result = {};

    for (var aKeyIndex in keyArray)
    {
        var aKey = keyArray[aKeyIndex];

        if (sourceDictionary.hasOwnProperty(aKey))
        {
            result[aKey] = sourceDictionary[aKey];
        }
    }

    return result;
}


/*
 *  Route:  Facebook App Logout
 *          Removes user session data
 */ 

authentication.path.logout = '/logout';

authentication.route.logout = 
    function(quest, ponse)
    {
        quest.session.destroy();

        _returnResponseWithMessage(ponse, 'logout');
    }

/*
 *  Route:  Facebook App Uninstall
 *          Uninstall facebook app and remove user session      
 */ 

authentication.auth.uninstall = 'user';

authentication.path.uninstall = '/uninstall';

authentication.route.uninstall = 
    function(quest, ponse)
    {
        if (!authentication.isUserRequest(quest))
            return _returnResponseWithMessage(ponse, 'User is not logged-in. I cannot do anything.');
        
        var user = quest.session.user;

        fb.graphAPI( user.getFacebookAccess(), 'DELETE', '/me/permissions',
            function(err, fbObject) {
                if(err) {
                    console.log('Delete error: ');
                    console.log(e);

                    _returnResponseWithMessage(ponse, 'Uninstall Error');
                }
            
                console.log('Delete success: ');
                console.log(fbObject);

                if (fbObject == true)
                    _returnResponseWithMessage(ponse, 'Uninstall OK');
                else
                    _returnResponseWithMessage(ponse, 'Uninstall failed: ' + JSON.stringify(fbObject) );
            });

        quest.session.destroy();
    }

function _returnResponseWithMessage(ponse, message)
{
    ponse.writeHead(200, {'Content-Type': 'text/html'});
    ponse.write('<html><body>');
    
    ponse.write('<p>' + message + '</p>');

    ponse.end('</body></html>');
}

// Request Info

authentication.isUserRequest =
    function(quest)
    {
        return quest.session.hasOwnProperty('user');
    };

authentication.isAdminRequest =
    function(quest)
    {
        if ( quest.session.hasOwnProperty('user') )
        {
            var user = quest.session.user;
            
            return user.getId() == identity.adminId();
        }
        
        return false;
    };


// Middleware

authentication.userSessionMiddleware =
    function(quest, ponse, next)
    {
        a.assert_def(quest.session);
        
        if ( quest.session.hasOwnProperty('user') )
        {
            quest.session.user = User.resurrect(quest.session.user);
            
            return next();
        }
        else if (quest.route.path == authentication.path.uninstall)
        {
            return next();
        }
        else
        {
            return _redirectToLogin(quest, ponse);
        }
    };

authentication.adminSessionMiddleware = 
    function(quest, ponse, next)
    {
        if ( authentication.isAdminRequest(quest) )
        {
            next();
        }
        else
        {
            ponse.writeHead(403, {'Content-Type': 'text/html'});
            ponse.write('<html><body>');
        
            ponse.write('<h1>Requires Admin Priviledges</h1>');
            ponse.write('</body></html>');
            ponse.end();
        }
    };

function _redirectToLogin(quest, ponse)
{
    var encodedURL = handy.ASCIItoBase64(quest.url);
    var redirectURL = authentication.path.login + '?source=' + encodedURL;

    ponse.redirect(redirectURL);

    console.log('AUTH-Redirect: ' + redirectURL);
}


// aux ----

authentication.sanitizeObject = 
    function(quest, ponse, object)
    {
        if (!object) 
        {
            return _respondWithErrorPage('facebook object is undefined');
        }

        var graphError = object['error'];

        if (graphError)
        {
            var type = graphError['type'];

            if (type == 'OAuthException')
            {
                _redirectToLogin(quest, ponse);
                return false;
            }
        }
        
        return true;

        function _respondWithErrorPage(error)
        {
            ponse.writeHead(200, {'Content-Type': 'text/html'} );
            ponse.write('<html><body>');
            ponse.write(error);
            ponse.end('</body></html>');
            return false;
        }
    }
