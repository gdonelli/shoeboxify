
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

                var user = new User(fa 
                    ,   function success(user) {
                            throw new Error('not supposed to work');
                        }
                    ,   function error(e) {
                            a.assert_def(e);
                            // console.log(e);
                            done();
                        });
            });
    });
