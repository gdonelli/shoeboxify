
var     assert  = require("assert")
    ,   url     = require("url")
    
    ,   service     = use('service')
    ,   mongo       = use('mongo')
    ,   authenticationTest = use('authentication.test')
    ;


describe('service.js',
    function() {


        describe( 'objectForURL',
            function() {
                it( 'Placeholder Object',
                    function(done)
                    {
                        var sourceURL = "https://sphotos-a.xx.fbcdn.net/hphotos-ash3/73827_622511435310_614274492_n.jpg";

                        service.getFacebookObjectForURL( 
                                authenticationTest.getFacebookAccess()
                            ,   sourceURL
                            ,   function object(o) {
                                    throw new Error('Not expected to have access to this');
                                }
                            ,   function placeholder(p) {
                                    assert( p.id == '622511435310', 'placeholder ID doesnt match. Given: ' + p.id);
                                    assert( p.source == sourceURL, 'placeholder.source doesnt match. Given: ' + p.source);
                                    done();
                                }
                            ,   function error(e) {
                                    throw new Error('Not expected to get error');
                                } );
                    } );


                it( 'Actual Object from photo.php',
                    function(done)
                    {
                        var sourceURL = "https://www.facebook.com/photo.php?fbid=10152170979900707&set=a.10150267612520707.502570.554390706&type=1";

                        service.getFacebookObjectForURL( 
                                authenticationTest.getFacebookAccess()
                            ,   sourceURL
                            ,   function object(o) {
                                    assert( o.id == '10152170979900707', 'object ID doesnt match. Given: ' + o.id);
                                    assert( o.picture != undefined, 'o.picture is undefined');
                                    assert( o.source != undefined,  'o.source is undefined');
                                    done();
                                }
                            ,   function placeholder(p) {
                                    throw new Error('Not expected to have access to this');
                                }
                            ,   function error(e) {
                                    throw new Error('Not expected to get error');
                                } );
                    } );

                it( 'Actual object from .jpg',
                    function(done)
                    {
                        // my profile pict
                        var sourceURL = "https://fbcdn-photos-a.akamaihd.net/hphotos-ak-ash3/524874_10152170979900707_270531713_s.jpg";

                        service.getFacebookObjectForURL( 
                                authenticationTest.getFacebookAccess()
                            ,   sourceURL
                            ,   function object(o) {
                                    assert( o.id == '10152170979900707', 'object ID doesnt match. Given: ' + o.id);
                                    assert( o.picture != undefined, 'o.picture is undefined');
                                    assert( o.source != undefined,  'o.source is undefined');
                                    done();
                                }
                            ,   function placeholder(p) {
                                    throw new Error('Not expected to have access to this');
                                }
                            ,   function error(e) {
                                    throw new Error('Not expected to get error');
                                } );
                    } );

                it( 'No object URL',
                    function(done)
                    {
                        var sourceURL = "https://fbcdn-photos-a.akamaihd.net/hphotos-ak-ash3/524874_XXXXXXXXXXX_270531713_s.jpg";

                        service.getFacebookObjectForURL( 
                                authenticationTest.getFacebookAccess()
                            ,   sourceURL
                            ,   function object(o) {
                                    throw new Error('Not expected to get object');
                                }
                            ,   function placeholder(p) {
                                    throw new Error('Not expected to have access to this');
                                }
                            ,   function error(e) {
                                    done();
                                } );
                    } );


            } );
    
        var testUser = 'T1';

        describe( 'copyObject',
            function()
            {
            } );


    } );
