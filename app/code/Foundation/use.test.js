
var     assert  = require("assert")
    ,   use     = require("./use")
    ;

describe('use.js',
    function() {
      
        it('use.module', 
            function() {
                var fb = use._module('fb');
                assert( fb != undefined, 'cannot find fb module' );
            } );

        it('use.class', 
            function() {
                var User    = use._class('User');
                assert( User != undefined, 'cannot find User class' );
            } );

        it('use.use',
            function() {
                var User    = use._class('User');
                var fb      = use._module('fb');
                var User2   = use.use('User');
                var fb2     = use.use('fb');

                assert( User == User2, 'use.use failed for User' );
                assert( fb == fb2, 'use.use failed for User' );
            } );

        it('use.use - fail', 
            function() {

                var caughtError = false;
                try
                {
                    assert( use.use('donotexits') != undefined, 'cannot find test' );
                }
                catch(e)
                {
                    caughtError = true;
                }

                assert(caughtError, 'expected error');
            } );

        it('constants',
            function() {
                var Photo = use.use('Photo');
                
                assert( use.k(Photo, 'IdKey') == '_id', 'id key is wrong');
            } );



    });
