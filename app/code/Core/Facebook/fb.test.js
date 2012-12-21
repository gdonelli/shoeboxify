
var     assert  = require('assert')

    ,   a                   = use('a')   
    ,   fb                  = use('fb')
    ,   authenticationTest  = use('authentication.test')
    ,   OperationQueue      = use('OperationQueue')
    ,   FacebookAccess      = use('FacebookAccess')
    ;


var fbTest = exports;

describe('fb.js',
    function() 
    {
         it( 'Graph: /me',
            function(done) {
                var fbAcccess = authenticationTest.getFacebookAccess();

                fb.graph(fbAcccess, '/me',
                    function(err, meObject) {
                        if (err)
                            throw err;
                 
                        assert(meObject != undefined , 'fbObject is undefined');
                        assert(meObject.id != undefined , 'meObject.id is undefined');
                        assert(meObject.email != undefined , 'meObject.email is undefined');
                        done();
                    });
            });


         it( 'wrong credentials',
            function(done) {
                var badAccess = new FacebookAccess('x', 'y');                
                fb.graph(badAccess, '/me',
                    function(err, meObject) {
                        if (err){
                            a.assert_def(err.code);
                            assert(err.code == 190, 'err.code is not 190');                        
                            return done();
                        }
                        
                        throw new Error('no supposed to work');
                    });
            });


    } );

fbTest.processFacebookObject =
    function(graphPath, callback)
    {
        var q = new OperationQueue(1);
        
        q.context = {};
        q.assert = true;

        // Fetch FB object      ->  q.context.object
        q.add(
            function FetchMeOperation(doneOp) {
                var fbAcccess = authenticationTest.getFacebookAccess();

                fb.graph(fbAcccess, graphPath,
                    function(err, meObject) {
                        if (err)
                            throw err;
                 
                        q.context.object = meObject;
                        doneOp();
                    });
            });

        // Process
        q.add(
            function ProcessOperation(doneOp) {
                callback(q.context.object);
                doneOp();
            });

        return q;
    };

