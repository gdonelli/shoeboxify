
var     assert  = require("assert")

    ,   a               = use("a")
    ,   User            = use("User")
    ,   FacebookAccess  = use("FacebookAccess")
    ;


describe('User.js',
    function() {
        it('User', 
            function(done) {
                var fa = new FacebookAccess('XXXXX', '181');

                var user = new User(fa,
                    function(err, user) {
                        if (err)
                            return done();
                            
                        throw new Error('not supposed to work');
                    });
            });
    });
