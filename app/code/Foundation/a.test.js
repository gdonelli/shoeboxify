
var     assert  = require("assert")
    ,   a       = use("a")
    ;


describe('a.js',
    function()
    {
        var identifyError = new Error('ERR');

        it( 'a.assert_fbId - function',
            function()
            {
                try {
                    a.assert_fbId( function() {} );
                    throw identifyError;
                }
                catch (e) {
                    if (e == identifyError)
                        throw new Error('not working');
                }
            });

        it( 'a.assert_fbId - valid string',
            function()
            {
                try {
                    a.assert_fbId( '12345' );
                    a.assert_fbId( '1' );
                }
                catch (e) {
                    throw e;
                }
            });

        it( 'a.assert_fbId - empty string',
            function()
            {
                try {
                    a.assert_fbId( '' );
                    throw identifyError;
                }
                catch (e) {
                    if (e == identifyError)
                        throw new Error('not working');
                }
            });

        it( 'a.assert_http_url - valid',
            function()
            {
                try {
                    a.assert_http_url( 'http://www.shoeboxify.com' );
                }
                catch (e) {
                    throw e;
                }
            });

        it( 'a.assert_http_url - function',
            function()
            {
                try {
                    a.assert_http_url( function() {} );
                    throw identifyError;
                }
                catch (e) {
                    if (e == identifyError)
                        throw new Error('not working');
                }
            });
        


    } );

