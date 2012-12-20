
var     assert  = require("assert")

    ,   a       = use("a")
    ,   mongo   = use("mongo")      // FIXME: get rid of it???
    ,   fbTest  = use("fb.test")

    ,   photodb         = use("photodb")
    ,   test_resources  = use("test-resources")
    ,   OperationQueue  = use("OperationQueue")
    ,   Photo           = use("Photo")
    ;


describe('photodb.js',
    function()
    {
        var userid1 = 'T1'; 
        var userid2 = 'T2';

        function _generateId()
        {
            var sampleId = Math.round(Math.random() * 100000);
            return '1' + sampleId + '1' 
        }


        describe('photodb (basics)',
            function()
            {
                it( 'photodb.setup',
                    function(done)
                    {
                        photodb.setup(test_resources.kTestUserId,
                            function(err) {
                                if (err)
                                    throw err;
                                  
                                done();
                            });
                    });
                 
                it( 'photodb.setup ' + userid1,
                    function(done) 
                    {   
                        photodb.setup( userid1,
                            function(err) {
                                if (err)
                                    throw err;
                                done();
                            });
                    } );

                it( 'photodb.setup ' + userid2,
                    function(done) 
                    {   
                        photodb.setup( userid2,
                            function(err) {
                                 if (err)
                                    throw err;
                                done();
                            });
                    } );

            });

        describe('photodb (Photo API)',
            function()
            {
                it( 'photodb.addPhoto',
                    function(done)
                    {
                        fbTest.processFacebookObject( test_resources.kSteveJobsPhotoId,
                            function(fbObject) {
                                var photo = new Photo( true, fbObject );

                                photodb.addPhoto(test_resources.kTestUserId, photo,
                                    function(err, addedPhoto)
                                    {
                                        if (err)
                                            throw err;
                                            
                                        a.assert_def( addedPhoto );
                                        a.assert_def( addedPhoto.getFacebookId() );
                                        a.assert_def( addedPhoto.getId() );

                                        // console.log(addedPhoto);
                                        done();
                                    });
                            });
                    });
                
                it ('photodb.getPhotoWithFacebookId', 
                    function(done) 
                    {    
                        photodb.getPhotoWithFacebookId( test_resources.kTestUserId, test_resources.kSteveJobsPhotoId,
                            function(err, photo)
                            {
                                if (err)
                                    throw err;

                                Photo.assert(photo);
                                assert(photo.getFacebookId() == test_resources.kSteveJobsPhotoId, 'fbId do not match');
                                done();
                            });
                    });

                it ('photodb.getPhotoWithFacebookId - undefined entry', 
                    function(done) 
                    {    
                        photodb.getPhotoWithFacebookId( test_resources.kTestUserId, test_resources.kPublicPhotoId,
                            function(err, entry)
                            {
                                if (err)
                                    throw err;

                                if (entry)
                                    console.error(entry);

                                assert(entry == null, 'expected to have undefined entry');

                                done();
                            });
                    });


                it( 'photodb.getAllPhotos',
                    function(done)
                    {
                        photodb.getAllPhotos(test_resources.kTestUserId,
                            function(err, photos)
                            {
                                if (err)
                                    throw err;
                                
                                photos.forEach(
                                    function(photo){
                                            Photo.assert(photo);
                                    } );

                                done();
                            });
                    });

            });

        describe('photodb (cleanup)',
            function()
            {
                it('photodb.drop ' + userid1,
                    function(done) 
                    {
                        photodb.drop(userid1,
                            function(err) {
                                if (err)
                                  throw err;
                          
                                done();
                            });
                    } );

                it('photodb.drop ' + userid2,
                    function(done) 
                    {
                        photodb.drop(userid2,
                            function(err) {
                                if (err)
                                  throw err;
                          
                                done();
                            });
                    } );
                 
            });


    });
