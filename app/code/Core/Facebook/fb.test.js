
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

                fb.graph(   fbAcccess
                        ,   '/me'
                        ,   function success(meObject) {
                                assert(meObject != undefined , 'fbObject is undefined');
                                assert(meObject.id != undefined , 'meObject.id is undefined');
                                assert(meObject.email != undefined , 'meObject.email is undefined');
                                done();
                            }
                        ,   function error(e) {
                                throw e;
                            } 
                        );
            } );


         it( 'wrong credentials',
            function(done) {
                var badAccess = new FacebookAccess('x', 'y');                
                fb.graph(
                        badAccess
                    ,   '/me'
                    ,   function success(meObject) {
                            throw new Error('not expected to work');
                        }
                    ,   function error(e) {
                            a.assert_def(e);
                            a.assert_def(e.code);
                            assert(e.code == 190, 'e.code is not 190');                        
                            done();
                        }
                    );
            } );


    } );

fbTest.processFacebookObject =
    function(graphPath, proccess_f)
    {
        var q = new OperationQueue(1);
        
        q.context = {};
        q.assert = true;

        // Fetch FB object      ->  q.context.object
        q.add(
            function FetchMeOperation(doneOp) {
                var fbAcccess = authenticationTest.getFacebookAccess();

                fb.graph(   fbAcccess
                        ,   graphPath
                        ,   function success(meObject) {
                                q.context.object = meObject;
                                doneOp();
                            }
                        ,   function error(e) { throw e; } 
                        );

            });

        // Process
        q.add(
            function ProcessOperation(doneOp) {
                proccess_f(q.context.object);
                doneOp();
            });

        return q;
    };

