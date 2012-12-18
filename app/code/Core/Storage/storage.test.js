
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
        describe.skip('storage - Facebook', 
            function()
            {
                it( 'storage.copyFacebookObject - me',
                    function(done) {
                        _copyFB('me'
                            ,   function success() {
                                    throw new Error('not supposed to work');
                                }
                            ,   function error(e) {
                                    a.assert_def(e);
                                    assert(e.code == storage.kInvalidObjectError, 'expected storage.kInvalidObjectError is:' + e.code );
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
                        _copyFB(test_resources.kOldPhotoId
                            ,   function success(theCopy) {
                                    a.assert_def(theCopy);
                                    a.assert_def(theCopy.picture);
                                    a.assert_def(theCopy.source);
                                    a.assert_def(theCopy.images);

                                    copyObject = theCopy;

                                    // console.log(copyObject);

                                    done();
                                }
                            ,   function error(e) {
                                    throw e;                        
                                });             
                    });

                it( 'storage.copyFacebookObject - kOldPhotoId - fail',
                    function(done) {
                        _copyFB( test_resources.kOldPhotoId
                            ,   function success(copy) {
                                    throw new Error('not expected to work');
                                }
                            ,   function error(e) {
                                    done();                     
                                }
                            ,   true );

                    });

                it ('storage.deleteFilesInCopyObject',
                    function(done)  {
                        storage.deleteFilesInCopyObject(
                                test_resources.kTestUserId
                            ,   copyObject
                            ,   function success() {
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;
                                });
                    });

                /* aux ====================== */
                function _checkSizeFacebookObject(graphPath, done)
                {
                    fbTest.processFacebookObject(
                        graphPath
                        ,   function(object) {
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
                
                function _copyFB( graphPath, success_f, error_f, forceFail)
                {
                    fbTest.processFacebookObject(
                                graphPath
                            ,   function process(fbObject) { 
                                    var q = storage.copyFacebookPhoto(  test_resources.kTestUserId
                                                                    ,   mongo.newObjectId()
                                                                    ,   fbObject
                                                                    ,   success_f
                                                                    ,   error_f );
                                    if (forceFail)
                                        q.context.failure = true;
                                });
                }

            } );

        describe('storage - Generic URL', 
            function()
            {
                var genericURLCopy;
                var tmpSnapshot = [];

                it ('tmp.snapshot', 
                    function(done) {
                        tmp.getFileList(
                            function (err, files) {
                                assert(err == null, 'cannot list /tmp');
                                tmpSnapshot = files;
                                done();
                            });
                    });

                it ('storage.copyImageURL',
                    function(done)
                    {
                        storage.copyImageURL(   test_resources.kTestUserId
                                            ,   mongo.newObjectId()
                                            ,   test_resources.kSamplePhotoDirectURL
                                            ,   function success(copyObject){
                                                    genericURLCopy = copyObject;

                                                    // console.log(copyObject);

                                                    done();
                                                }
                                            ,   function error(e)
                                                {
                                                    throw e;
                                                } );
                    });

                it ('storage.deleteFilesInCopyObject',
                    function(done)
                    {
                        storage.deleteFilesInCopyObject(
                                                test_resources.kTestUserId
                                            ,   genericURLCopy
                                            ,   function success(){
                                                    done();
                                                }
                                            ,   function error(e)
                                                {
                                                    throw e;
                                                } );
                    });

                it ('No traces in tmp', 
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

    } );
