
var     assert  = require("assert")

    ,   use = require('../../use')
    ,   FacebookAccess  = use.class("FacebookAccess")
    ;

describe('FacebookAccess.js',
    function() {
        it('FacebookAccess', 
            function(){
                var fbAcccess = new FacebookAccess('XXXXX', '181');
                
                assert(fbAcccess != undefined, 'fbAcccess is undefined');
            } );
    });
