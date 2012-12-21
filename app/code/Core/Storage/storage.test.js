
var     assert  = require('assert')
    ,   _       = require('underscore')

    ,   a       = use('a')
    ,   tmp     = use('tmp')
    ,   mongo   = use('mongo')
    ,   storage = use('storage')

    ,   fbTest  = use('fb.test')

    ,   test_resources  = use('test-resources')
    ,   OperationQueue  = use('OperationQueue');
    ;


describe('storage.js',
    function()
    {
        var s3snapshot  = [];
        var tmpSnapshot = [];

        describe('Save footprint',
            function()
            {
                it( 'storage.getPaths - s3 snapshot',
                    function(done) {
                        storage.getPaths(test_resources.kTestUserId,
                            function(err, list) {
                                if (err)
                                    throw err;
                                s3snapshot = list;
                                done();
                            });
                    });

                it ('tmp.getFileList - tmp snapshot', 
                    function(done) {
                        tmp.getFileList(
                            function(err, files) {
                                if (err)
                                    throw err;
                                tmpSnapshot = files;
                                done();
                            });
                    });
            });


        describe('storage - Facebook', 
            function()
            {
                it( 'storage.copyFacebookObject - me',
                    function(done) {
                        _copyFB('me',
                            function(err, object) {
                                a.assert_def(err);
                                assert(err.code == storage.kInvalidObjectError, 'expected storage.kInvalidObjectError is:' + err.code );
                                done();
                            });
                    });

                // gdonelli my profile pict
                it( 'storage.private.getImageDictionaryForFacebookPhoto - kProfilePhotoId',
                    function(done) {
                        _checkSizeFacebookObject( test_resources.kProfilePhotoId, done );      
                    });

                // gdonelli oldest pict
                it( 'storage.private.getImageDictionaryForFacebookPhoto - kOldPhotoId',
                    function(done) {
                        _checkSizeFacebookObject( test_resources.kOldPhotoId, done );       
                    });

                var copyObject;

                it( 'storage.copyFacebookObject - kOldPhotoId',
                    function(done) {
                        _copyFB(test_resources.kOldPhotoId,
                            function(err, theCopy) {
                                if (err)
                                    throw err;
                                
                                a.assert_def(theCopy);
                                a.assert_def(theCopy.picture);
                                a.assert_def(theCopy.source);
                                a.assert_def(theCopy.images);

                                copyObject = theCopy;

                                done();
                            });
                    });

                it( 'storage.copyFacebookObject - kOldPhotoId - fail',
                    function(done) {
                        _copyFB( test_resources.kOldPhotoId,
                            function(err, copy) {
                                if (err)
                                    return done();
                                throw new Error('should fail');
                            },
                            true );

                    });

                it( 'storage.getPaths - midcheck - more s3 files',
                    function(done) {
                        storage.getPaths(test_resources.kTestUserId,
                            function(err, list) {
                                if (err)
                                    throw err;
                                    
                                var listDiff = _.difference(list, s3snapshot);
                                assert( listDiff.length > 0, 'no file has been added');
                                done();
                            });
                    });


                it ('storage.deleteFilesInCopyObject',
                    function(done)  {
                        storage.deleteFilesInCopyObject(test_resources.kTestUserId, copyObject,
                            function(err) {
                                if (err)
                                    throw err;
                                else
                                    done();
                            });
                    });


                /* aux ====================== */

                function _checkSizeFacebookObject(graphPath, done)
                {
                    fbTest.processFacebookObject( graphPath,
                        function(object) {
                            assert(object.error == undefined, 'cannot fetch fb object');

                            var imageDict = storage.private.getImageDictionaryForFacebookPhoto(object);
                            var allKeys = Object.keys(imageDict);

                            assert( allKeys.length > 5, 'expected more images ' + allKeys );

                            var original;

                            for (var key in imageDict)
                            {
                                var entry = imageDict[key];

                                if (entry.original == true)
                                {
                                    a.assert_def(entry.size);
                                    a.assert_def(entry.size.width);
                                    a.assert_def(entry.size.height);

                                    assert( original == undefined, 'original was already found!' )
                                    original = entry;
                                }

                            }

                            a.assert_def(original);

                            for (var key in imageDict)
                            {
                                var entry = imageDict[key];

                                assert( (entry.size.width * entry.size.height) <=
                                        (original.size.width * original.size.height),
                                        'original is not bigger entry'  );
                            }

                            done();
                        } );                
                }
                
                function _copyFB( graphPath, callback, forceFail)
                {
                    fbTest.processFacebookObject(graphPath,
                    	function process(fbObject) {
                            var q = storage.copyFacebookPhoto(  test_resources.kTestUserId
                                                            ,   mongo.newObjectId()
                                                            ,   fbObject
                                                            ,   callback );
                            if (forceFail)
                                q.context.failure = true;
                        });
                }

            } );

        describe('storage - Generic URL', 
            function()
            {
                var genericURLCopy;

                it ('storage.copyImageURL',
                    function(done)
                    {
                        storage.copyImageURL(   test_resources.kTestUserId
                                            ,   mongo.newObjectId()
                                            ,   test_resources.kSamplePhotoDirectURL
                                            ,   function(err, copyObject){
                                                    if (err)
                                                        throw err;
                                             
                                                    genericURLCopy = copyObject;

                                                    done();
                                                } );
                    });

                it ('storage.deleteFilesInCopyObject',
                    function(done)
                    {
                        storage.deleteFilesInCopyObject( test_resources.kTestUserId, genericURLCopy,
                            function(err){
                                if (err)
                                    throw err;
                                else
                                    done();
                            });
                    });

            });

        describe('storage.private',
            function()
            {
                it( 'storage.private.imageDestinationPath',
                    function(){
                        var id1 = mongo.newObjectId();
                        var path1a = storage.private.imageDestinationPath(test_resources.kTestUserId, id1, false, { index: 0 } );
                        var path1b = storage.private.imageDestinationPath(test_resources.kTestUserId, id1, true, { index: 0 } );
                        
                        assert( path1a.split('/').length > 3, 'path not looking right: ' + path1a);
                        assert(path1a != path1b, 'path1a expected to be different from path1b');

                        var path2 = storage.private.imageDestinationPath(test_resources.kTestUserId, mongo.newObjectId(), true, { index: 0, size: { width: 256, height: 128 } } );
                        assert(path2.split('/').length > 3, 'path not looking right: ' + path2);
                    });

                it( 'storage.private.jsonDestinationPath',
                    function(){
                        var jsonPath = storage.private.jsonDestinationPath(test_resources.kTestUserId , mongo.newObjectId() );

                        assert(jsonPath.split('/').length > 3, 'path not looking right: ' + jsonPath);
                    });
            } );

        describe('Check footprint',
            function()
            {
                it( 'storage.getPaths - Zero footprint in S3',
                    function(done) {
                        storage.getPaths( test_resources.kTestUserId,
                            function(err, list) {
                                if (err)
                                    throw err;

                                var listDiff = _.difference(list, s3snapshot);
                                if (listDiff.length == 0)
                                	done();
                            });
                    });

                it ('tmp.getFileList - No traces in tmp', 
                    function(done) {
                        tmp.getFileList(
                            function (err, files) 
                            {
                                var filediff = _.difference(files, tmpSnapshot);

                                if ( filediff.length > 0) {
                                    console.error('extra files in /tmp:');
                                    console.error(filediff);
                                    throw new Error('tmp is not clean as expected');
                                }
                                else
                                    done();
                            });
                    });
            });
        
        // TODO: Should test with a user with more than 1000+ files in storage
        
        describe('storage.remove',
            function()
            {
                var userT1000 = 'T1000';

                it( 'storage.remove',
                    function(done) {
                        storage.copyImageURL(userT1000, mongo.newObjectId(), test_resources.kSamplePhotoDirectURL,
                            function(err, copyObject)
                            {
                                if (err) throw err;
                                
                                storage.remove(userT1000,
                                    function(err)
                                    {
                                        if (err) throw err;
                                        
                                        storage.getPaths(userT1000,
                                            function(err, paths)
                                            {
                                                assert(paths.length == 0, 'paths.length expected to be 0');
                                                done();
                                            });
                                    });
                            });
                    });
            });
         
         
         
    } );
