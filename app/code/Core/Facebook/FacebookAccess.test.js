
var     a               = use('a')
    ,   FacebookAccess  = use('FacebookAccess')
    ;

describe('FacebookAccess.js',
    function() {
        it('FacebookAccess', 
            function(){
                var fbAcccess = new FacebookAccess('XXXXX', '181');
                
                a.assert_def(fbAcccess, 'fbAcccess is undefined');
            } );
    });
