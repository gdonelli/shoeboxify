
var     assert  = require("assert")

    ,   a       = use("a")
    ,   mongo   = use("mongo")

    ,   database        = use("database")
    ,   fbTest          = use("fb.test")
    ,   testResources   = use("test-resources")
    ,   OperationQueue  = use("OperationQueue")
    ;


describe('database.js',
    function()
    {
        it( 'mongo.init',
                function(done)
                {
                    mongo.init( function success() {
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                } );
                });

        it( 'database.init',
                function(done)
                {
                    database.init(testResources.k.TestUserId
                        ,   function success() {
                                done();
                            }
                        ,   function error(e) {
                                throw e;
                            });
                });

        it( 'database.addFacebookPhoto',
                function(done)
                {
                    var docId = database.newObjectId();

                    fbTest.processFacebookObject( 
                            testResources.k.SteveJobsPhotoId
                        ,   function(object) {
                                // console.log(object);

                                database.addFacebookPhoto(  
                                        testResources.k.TestUserId
                                    ,   database.newObjectId()
                                    ,   object
                                    ,   object
                                    ,   function success(entry) 
                                        {
                                            a.assert_def(entry);
                                            // console.log();
                                            done();
                                        }
                                    ,   function error(e) 
                                        {
                                            throw e;
                                        });
                            });
                });

        it( 'database.removeFacebookPhoto',
                function(done)
                {
                    database.removeFacebookPhoto(
                                testResources.k.TestUserId
                            ,   testResources.k.SteveJobsPhotoId
                            ,   function success(entry) 
                                {
                                    done();
                                }
                            ,   function error(e) 
                                {
                                    throw e;
                                });
                });
    } );
