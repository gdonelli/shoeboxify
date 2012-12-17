
var     assert  = require("assert")

    ,   a       = use("a")
    ,   mongo   = use("mongo")      // FIXME: get rid of it
    ,   fbTest  = use("fb.test")

    ,   photodb         = use("photodb")
    ,   testResources   = use("test-resources")
    ,   OperationQueue  = use("OperationQueue")
    ,   Photo           = use("Photo")
    ;


describe('photodb.js',
    function()
    {
        describe('photodb (basics)',
            function()
            {
                it( 'photodb.init',
                    function(done)
                    {
                        photodb.init(testResources.k.TestUserId
                            ,   function success() {
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                });
                    } );
            } );




        var userid1 = 'T1'; 
        var userid2 = 'T2';

        function _generateId()
        {
            var sampleId = Math.round(Math.random() * 100000);
            return '1' + sampleId + '1' 
        }

        describe('photodb (private)',
            function()
            {
                var testCollection;

                it( 'photodb._getCollection',
                    function(done)
                    {                       
                        photodb._getCollection(
                                testResources.k.TestUserId
                            ,   function success(c) {
                                    a.assert_def(c);
                                    testCollection = c;
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                });
                    });

                it( 'photodb._setupCollection',
                    function(done)
                    {
                        photodb._setupCollection(
                                testResources.k.TestUserId
                            ,   function success(c) {
                                    a.assert_def(c);
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                });
                    });

                it( 'photodb.init ' + userid1,
                    function(done) 
                    {   
                        photodb.init( userid1
                            ,   function success(r) { done(); }
                            ,   function error(e) { throw e; } );
                    } );

                it( 'photodb.init ' + userid2,
                    function(done) 
                    {   
                        photodb.init( userid2
                            ,   function success(r) { done(); }
                            ,   function error(e) { throw e; } );
                    } );

                var sampleIdLong    = mongo.LongFromString( _generateId() );
                var sampleObjectId  = mongo.newObjectId();

                var sampleObject = {
                            _id:        sampleObjectId,
                            longId:     sampleIdLong
                        ,   payload:    'M’illumino\nd’immenso'
                        };

                it( 'photodb._add sampleObject to ' + userid1,
                    function(done) 
                    {   
                        photodb._add( userid1, sampleObject
                            ,   function success(r){ 
                                    a.assert_def(r);
                                    assert(sampleObjectId == r._id, 'sampleObjectId == r._id' );
                                    done();    
                                }
                            ,   function error(e){   throw e;   } );
                    } );

                it( 'photodb.getPhotoWithId sampleObjectId from ' + userid1,
                    function(done) 
                    {   
                        photodb.getPhotoWithId( 
                                userid1
                            ,   sampleObjectId
                            ,   function success(r) {
                                    a.assert_def(r);
                                    done();    
                                }
                            ,   function error(e){   throw e;   } );
                    } );

                it( 'photodb._add sampleObject to ' + userid1 + ' - again',
                    function(done) 
                    {   
                        photodb._add( userid1, sampleObject
                            ,   function success(r){ throw new Error('not expected to work');   }
                            ,   function error(e){   done();    } );
                    } );


                it( 'photodb._add sampleObject to ' + userid2,
                    function(done) 
                    {   
                        photodb._add( userid2, sampleObject
                            ,   function success(r){ done();    }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._remove from ' + userid2,
                    function(done) 
                    {   
                        photodb._remove( userid2, { longId: sampleIdLong } 
                            ,   function success(r){ 
                                    assert(r == 1, 'r expected to be 1');
                                    done(); 
                                }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._remove from ' + userid1,
                    function(done) 
                    {   
                        photodb._remove( userid1, {} 
                            ,   function success(r){ 
                                    assert(r == 1, 'r expected to be 1, is ' + r);
                                    done(); 
                                }
                            ,   function error(e){   throw e;   }
                            ,   { force: true });
                    } );

                it( 'photodb._findAll {} from ' + userid1,
                    function(done) 
                    {   
                        photodb._findAll( userid1, {} 
                            ,   function success(r){ 
                                    assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
                                    done(); 
                                }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._findAll {} from ' + userid2,
                    function(done) 
                    {   
                        photodb._findAll( userid2, {} 
                            ,   function success(r){ 
                                    assert(r.length == 0, 'r.length expected to be 0, is: ' + r.length);
                                    done(); 
                                }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._add sampleObject to ' + userid2,
                    function(done) 
                    {   
                        photodb._add( userid2, sampleObject
                            ,   function success(r){ done();    }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._findAll from ' + userid2,
                    function(done) 
                    {   
                        photodb._findAll( userid2, {} 
                            ,   function success(r){ 
                                    assert(r.length == 1, 'r.length expected to be 1, is: ' + r.length);
                                    done(); 
                                }
                            ,   function error(e){   throw e;   });
                    } );

                it( 'photodb._add removePhotoWithId getPhotoWithId',
                    function(done) 
                    {   
                        photodb._add( userid1, sampleObject
                            ,   function success(entry) 
                                {
                                    var newObjectId = entry._id;

                                    a.assert_def( newObjectId, 'newObjectId');

                                    photodb.removePhotoWithId(
                                            userid1
                                        ,   newObjectId 
                                        ,   function success()
                                            {
                                                photodb.getPhotoWithId(
                                                        userid1
                                                    ,   newObjectId
                                                    ,   function success(entry) {
                                                            assert(entry == null, 'entry expected to be null');
                                                            done();
                                                        }
                                                    ,   function error(e) {
                                                            throw e;
                                                        });

                                            }
                                        ,   function error(error)
                                            {
                                                throw e;                
                                            } );
                                }
                            ,   function error(e){   throw e;   } );
                    } );
            });



        describe('photodb (Photo API)',
            function()
            {
                it( 'photodb.addPhoto',
                    function(done)
                    {
                        fbTest.processFacebookObject( 
                                testResources.k.SteveJobsPhotoId
                            ,   function(fbObject) {
                                    var photo = new Photo( true, fbObject );

                                    photodb.addPhoto(  
                                            testResources.k.TestUserId
                                        ,   photo
                                        ,   function success(addedPhoto) 
                                            {
                                                a.assert_def( addedPhoto );
                                                a.assert_def( addedPhoto.getFacebookId() );
                                                a.assert_def( addedPhoto.getId() );

                                                // console.log(addedPhoto);
                                                done();
                                            }
                                        ,   function error(e) 
                                            {
                                                throw e;
                                            });
                                });
                    });
                
                it ('photodb.getPhotoWithFacebookId', 
                    function(done) 
                    {    
                        photodb.getPhotoWithFacebookId(
                                    testResources.k.TestUserId
                                ,   testResources.k.SteveJobsPhotoId
                                ,   function success(photo) 
                                    {
                                        Photo.assert(photo);
                                        assert(photo.getFacebookId() == testResources.k.SteveJobsPhotoId, 'fbId do not match');
                                        done();
                                    }
                                ,   function error(e) {
                                        throw e;
                                    } );
                    });

                it ('photodb.getPhotoWithFacebookId - undefined entry', 
                    function(done) 
                    {    
                        photodb.getPhotoWithFacebookId(
                                    testResources.k.TestUserId
                                ,   testResources.k.PublicPhotoId
                                ,   function success(entry) 
                                    {
                                        if (entry)
                                            console.error(entry);

                                        assert(entry == null, 'expected to have undefined entry');

                                        done();
                                    }
                                ,   function error(e) {
                                        throw e;
                                    } );
                    });


                it( 'photodb.getAllPhotos',
                    function(done)
                    {
                        photodb.getAllPhotos(   
                                    testResources.k.TestUserId
                                ,   function success(arrayOfPhotos)
                                    {
                                        for (var i in arrayOfPhotos)
                                        {
                                            var photo_i = arrayOfPhotos[i];
                                            
                                            Photo.assert(photo_i);
                                        }

                                        done();
                                    }
                                ,   function error(e) {
                                        throw e;
                                    } );
                    });

            });

        describe('photodb (cleanup)',
            function()
            {
                it('photodb._drop ' + userid1,
                    function(done) 
                    {
                        photodb._drop(  userid1
                                    ,   function success() {
                                            done();
                                        }
                                    ,   function error(e) {
                                            throw e;
                                        });
                    } );

                it('photodb._drop ' + userid2,
                    function(done) 
                    {
                        photodb._drop(  userid2
                                    ,   function success() {
                                            done();
                                        }
                                    ,   function error(e) {
                                            throw e;
                                        });
                    } );

            });


    });
