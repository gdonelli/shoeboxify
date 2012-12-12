
var     assert  = require("assert")
    ,   use     = require("./use")
    ;


var User    = use.class('User');
var fb      = use.module('fb');

var User2    = use.use('User');
var fb2      = use.use('fb');


describe('use.js',
    function() {
      
        it('use.module', 
            function() {               
                assert( fb != undefined, 'cannot find fb module' );
            } );

        it('use.class', 
            function() {
                assert( User != undefined, 'cannot find User class' );
            } );

        it('use.use', 
            function() {
                assert( User == User2, 'use.use failed for User' );
                assert( fb == fb2, 'use.use failed for User' );
            } );

        it('use.module - fail', 
            function() {

                var caughtError = false;
                try
                {
                    assert( use.module('donotexits') != undefined, 'cannot find test' );    
                }
                catch(e)
                {
                    caughtError = true;
                }

                assert(caughtError, 'expected error');
            } );


    });