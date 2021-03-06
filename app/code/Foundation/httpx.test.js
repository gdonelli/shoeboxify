
var     assert  = require('assert')
    ,   httpx   = use('httpx')
    ;


describe('httpx.js',
    function() {

        var httpApple = 'http://www.apple.com';

        it( 'httpx.GET(http...) ' + httpApple,
            function(done) 
            {               
                _test_GET_site(httpApple, done);
            } );

        var httpsWells = 'https://www.apple.com';

        it( 'httpx.GET(https...) ' + httpsWells,
            function(done) 
            {               
                _test_GET_site( httpsWells, done );
            } );

        it( 'httpx.HEAD ' + httpsWells,
            function(done) 
            {
                httpx.HEAD(httpsWells
                    ,   function success(ponse) {
                            // console.log('ponse.headers:');
                            // console.log(ponse.headers);
                            done();
                        }
                    ,   function error(e) {
                            throw e;
                        });

            } );

        var dontexist = 'https://sphotos-b.xx.fbcdn.net/hphotos-snc7/575052_10151241240779286_6119758003_n.jpg';

        it( 'httpx.HEAD ' + dontexist,
            function(done) 
            {
                httpx.HEAD( 
                        dontexist
                    ,   function success(ponse) {
                            // console.log('ponse.statusCode: ' + ponse.statusCode);
                            // console.log('ponse.headers:');
                            // console.log(ponse.headers);
                            done();
                        }
                    ,   function error(e) {
                            throw e;
                        });

            } );
        
        function _test_GET_site( theURL, done )
        {
            httpx.GET(  theURL
            		,	function OK_200(read_s, ponse) {
                            assert(read_s.indexOf('<html') >= 0, 'Cannot find <html> tag');
                            assert(read_s.indexOf('<head') >= 0, 'Cannot find <head> tag');
                            assert(read_s.indexOf('<body') >= 0, 'Cannot find <head> tag');
                            done();
                        }
                    ,   function other(ponse) {
                            console.error('otherResponse: ponse.statusCode');
                            console.error(ponse.statusCode);
                            throw new Error('Cannot fetch ' + theURL);
                        }
                    ,   function error(e) {
                            throw e;
                        });
        }


    } );
