
var     assert  = require("assert")

    ,   a       = use("a")
    ,   mongo   = use("mongo")      // FIXME: get rid of it
    ,   fbTest  = use("fb.test")

    ,   photodb         = use("photodb")
    ,   testResources   = use("test-resources")
    ,   OperationQueue  = use("OperationQueue")
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

                it( 'photodb.newPhotoId',
                    function()
                    {
                        var id = photodb.newPhotoId();
                        photodb.assert_photoId(id);
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

                var sampleIdLong = mongo.LongFromString( _generateId() );
                var sampleObject = { 
                            id: sampleIdLong
                        ,   payload:    'M’illumino\nd’immenso'
                        };

                var sampleObjectId;

                it( 'photodb._add sampleObject to ' + userid1,
                    function(done) 
                    {   
                        photodb._add( userid1, sampleObject
                            ,   function success(r){ 
                                    a.assert_def(r);
                                    sampleObjectId = r._id;
                                    done();    
                                }
                            ,   function error(e){   throw e;   } );
                    } );

                it( 'photodb._findId sampleObjectId to ' + userid1,
                    function(done) 
                    {   
                        photodb._findId( 
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
                        photodb._remove( userid2, { id: sampleIdLong } 
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

                it( 'photodb._add _removeId _findId',
                    function(done) 
                    {   
                        photodb._add( userid1, sampleObject
                            ,   function success(entry) 
                                {
                                    var newObjectId = entry._id;

                                    a.assert_def( newObjectId, 'newObjectId');

                                    photodb._removeId(userid1, newObjectId 
                                        ,   function success() {

                                                photodb._findId(userid1, newObjectId
                                                    ,   function success(entry) {
                                                            assert(entry == null, 'entry expected to be null');
                                                            done();
                                                        }
                                                    ,   function error(e) {
                                                            throw e;
                                                        });

                                            }
                                        ,   function error(error) {
                                                throw e;                
                                            } );
                                }
                            ,   function error(e){   throw e;   } );
                    } );
            });


        describe.skip('photodb (API)',
            function()
            {
                it( 'photodb.addFacebookPhoto',
                    function(done)
                    {
                        fbTest.processFacebookObject( 
                                testResources.k.SteveJobsPhotoId
                            ,   function(object) {
                                    // console.log(object);

                                    photodb.addFacebookPhoto(  
                                            testResources.k.TestUserId
                                        ,   photodb.newPhotoId()
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

                it( 'photodb.removeFacebookPhoto',
                    function(done)
                    {
                        photodb.removeFacebookPhoto(
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

                var fakeFacebookObject  = {};
                fakeFacebookObject.id   = _generateId();
                fakeFacebookObject.picture  = 'some picture';
                fakeFacebookObject.source   = 'some source';
                fakeFacebookObject.images   = [];

                var copyObject  = {};
                copyObject.picture  = 'copy picture';
                copyObject.source   = 'copy source';
                copyObject.images   = [];

                function _addFBObject(done, expectedSuccess)
                {
                    photodb.addFacebookObject( 
                            userid1
                        ,   fakeFacebookObject.id
                        ,   fakeFacebookObject
                        ,   copyObject
                        ,   function success(r) {   if (expectedSuccess) done();    else    throw new Error('Success expected');    }
                        ,   function error(e)   {   if (expectedSuccess) throw e;   else    done();     } 
                        );                  
                }

                it( 'photodb.addFacebookObject',
                    function(done) 
                    {
                        _addFBObject(done, true);
                    } );

                it( 'photodb.addFacebookObject - again - should fail',
                    function(done) 
                    {   
                        _addFBObject(done, false);
                    } );

                it( 'photodb.removeFacebookPhoto',
                    function(done) 
                    {   
                        photodb.removeFacebookPhoto( 
                                userid1
                            ,   fakeFacebookObject.id
                            ,   function success(r) {   done(); }
                            ,   function error(e)   {   throw e; }
                            );
                    } );

                it( 'photodb.addFacebookObject - after remove',
                    function(done) 
                    {   
                        _addFBObject(done, true);
                    } );

                it( 'photodb.findOneFacebookObject',
                    function(done) 
                    {   
                        photodb.findOneFacebookObject( 
                                userid1
                            ,   fakeFacebookObject.id
                            ,   function success(r)
                                {
                                    a.assert_def(r);

                                    // assert( mongo.memento.entity.getFacebookId(r)   != undefined, 'id is undefined');
                                    // assert( mongo.memento.entity.getFacebookUserId(r)!= undefined, 'user_id is undefined');
                                    // assert( mongo.memento.entity.getFacebookId(r)   == mongo.LongFromString(fakeFacebookObject.id), 'graph id dont match');
                                    
                                    done();
                                }
                            ,   function error(e) { throw e; } );
                    } );

                it( 'photodb.findAllFacebookObjects',
                    function(done) 
                    {   
                        photodb.findAllFacebookObjects( 
                                userid1
                            ,   function success(r)
                                {
                                    assert(r.length > 0, 'r.length > 0');                               
                                    done();
                                }
                            ,   function error(e) { throw e; } );
                    } );

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
