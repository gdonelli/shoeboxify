/*

==================[   Athentication test   ]===================

Import:
            authTest    = require("./authetication.test")
Pseudo-Request:
            authTest.request
            authTest.getRequest

================================================================

*/

var     assert  = require("assert")
    ,   fs      = require("fs")
    ,   spawn   = require('child_process').spawn

    ,   a      = use("a") 
    ,   admin  = use("admin")

    ,   FacebookAccess  = use('FacebookAccess')
    ,   User            = use('User')
    ;


var ACCESS_TOKEN_CACHE_MAX_AGE = 1000 * 60 * 60; // 1 hour

var authenticationTest = exports;

/* ============================================================= */
/* ============================================================= */
/* ================ API for other Unit Tests   ================= */
/* ============================================================= */
/* ============================================================= */

authenticationTest._facebookAccess = undefined;
authenticationTest.getFacebookAccess =
    function()
    {
        FacebookAccess.assert(authenticationTest._facebookAccess);
        return authenticationTest._facebookAccess;
    };

authenticationTest._user = undefined;
authenticationTest.getUser =
    function()
    {
        User.assert(authenticationTest._user);
        return authenticationTest._user;
    };

authenticationTest._quest = undefined;
authenticationTest.getRequest =
    function()
    {
        a.assert_def(authenticationTest._quest);
        return authenticationTest._quest;
    };

/* ============================================================= */
/* ============================================================= */
/* ======================= TEST/SETUP ========================== */
/* ============================================================= */
/* ============================================================= */

describe('authentication.test.js',
    function() {
        
        var context = {};

        it('Fetch Facebook AccessToken', //    -> context.accessTokenData
            function(done) {
                _getAccessToken( 
                        function success(jsonData)
                        {
                            // console.log(jsonData);
                            context.accessTokenData = jsonData;
                            done();
                        }
                    ,   function error(e)
                        {
                            console.error(e.stack);
                            throw e;
                        } );
            });

        it('new FacebookAccess', //         -> context.fbAccess
            function()
            {
                var accessToken = a.assert_def(context.accessTokenData.accessToken);
                var expires = a.assert_def(context.accessTokenData.expires);

                var fbAccess = new FacebookAccess( accessToken, expires ); 
                FacebookAccess.assert(fbAccess);

                context.fbAccess = fbAccess;
            });
        
        it('new User',  //                  -> context.user
            function(done)
            {
                new User(   context.fbAccess
                        ,   function success(user)
                            {
                                User.assert(user);
                         
                                user.getId = function(){ return 'T1' };
                                context.user = user;
                         
                                done();
                            }
                        ,   function error(e)
                            {
                                throw e;
                            } );
            });

        it('Setup unit test API', 
            function(){
                authenticationTest._facebookAccess = context.fbAccess;
                authenticationTest._user = context.user;

                authenticationTest._quest = {};
                authenticationTest._quest.session = {};
                authenticationTest._quest.session.user = context.user;
            });

    });

/* aux ============================================================== */


function _getAccessToken( success_f /* jsonData */, error_f )
{
    fs.readFile(admin.k.AccessTokenCacheFilePath,
        function (err, data) {
            if (err) 
            {
                console.log('no cache file in ' + admin.k.AccessTokenCacheFilePath);
                _miss();
            }
            else
            {
                var fileContent = data.toString();
                var cache =  JSON.parse(fileContent);

                var logString = 'Cache: ';
                logString += admin.k.AccessTokenCacheFilePath;

                var cacheValid = true;

                if (cache.date)
                {
                    var now = new Date();
                    var then = new Date(cache.date);

                    var cacheAge = now.getTime() - then.getTime();

                    logString += ', age: ' + Math.round( cacheAge / 1000 / 60 * 10 ) / 10 + ' minutes';

                    cacheValid = (cacheAge < ACCESS_TOKEN_CACHE_MAX_AGE);
                }
                else
                {
                    logString += ' no cache.date -> assume OK';
                }

                console.log(logString);

                if (cacheValid)
                    _useAuth(cache.payload);
                else
                    _miss();
            } 
        } );

    function _useAuth(jsonData)
    {
        success_f(jsonData);
    }

    function _miss() {
        _getAccessTokenWithExternalApp( 
                function success(jsonData) 
                {
                    _useAuth(jsonData)

                    var cache = {};
                    cache.date = new Date();
                    cache.payload = jsonData;

                    fs.writeFile(admin.k.AccessTokenCacheFilePath, JSON.stringify(cache) );
                }
            ,   error_f );
    }
}


function _getAccessTokenWithExternalApp( success_f /* jsonData */, error_f )
{
    var app = spawn('/tmp/sym/Release/Facebook Login.app/Contents/MacOS/Facebook Login');

    app.stdout.on('data',
            function (data) {

                try {
                    var jsonData = JSON.parse(data);
                
                    if (success_f)
                        success_f(jsonData);            
                }
                catch(e)
                {
                    console.error('***** Failed to process auth data. error:');
                    console.error(e);

                    console.error('**** Data:');
                    console.error(data.toString());         

                    if (error_f)
                        error_f(e);
                }
            });

    app.stderr.on('data',
        function (data) {
            console.log('stderr: ' + data);

            if (error_f)
                error_f(data);
        
        });

    app.on('exit', function (code) {
        assert(code == 0, 'Facebook Login exited with ' + code);

        // console.log('child process exited with code ' + code);
    }); 
}

