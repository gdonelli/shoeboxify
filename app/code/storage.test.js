
var     assert  = require("assert")

    ,   a       = use('a')
    ,   fbTest  = use('fb.test')
    ,   mongo   = use('mongo')
    ,   storage = use('storage')

    ,   OperationQueue  = use('OperationQueue');
    ;


var testUserId = 'T1';

describe('storage.js',
    function()
    {
        describe('storage', 
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
                                    assert(e.code == storage.k.InvalidObjectError, 'expected storage.k.InvalidObjectError is:' + e.code );
                                    done();
                                });             
                    });

                // gdonelli my profile pict
                it( 'storage.private.getImageDictionaryForFacebookPhoto - 10152170979900707',
                    function(done) {
                        _checkSizeFacebookObject( '10152170979900707', done );      
                    });

                // gdonelli oldest pict
                it( 'storage.private.getImageDictionaryForFacebookPhoto - 515258326088',
                    function(done) {
                        _checkSizeFacebookObject( '515258326088', done );       
                    });


                it( 'storage.copyFacebookObject - 515258326088',
                    function(done) {
                        _copyFB('515258326088'
                            ,   function success(copy) {
                                    a.assert_def(copy);
                                    a.assert_def(copy.picture);
                                    a.assert_def(copy.source);
                                    a.assert_def(copy.images);
                                    done();
                                }
                            ,   function error(e) {
                                    throw e;                        
                                });             
                    });

                it( 'storage.copyFacebookObject - 515258326088 - fail',
                    function(done) {
                        _copyFB('515258326088'
                            ,   function success(copy) {
                                    throw new Error('not expected to work');
                                }
                            ,   function error(e) {
                                    done();                     
                                }
                            ,   true );

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
                                    var q = storage.copyFacebookPhoto( testUserId, mongo.newObjectId(), fbObject, success_f, error_f );
                                    if (forceFail)
                                        q.context.failure = true;
                                });
                }

            } );

        describe('storage.private',
            function()
            {
                it( 'storage.private.imageDestinationPath',
                    function(){
                        var id1 = mongo.newObjectId();
                        var path1a = storage.private.imageDestinationPath('T1', id1, false, { index: 0 } );
                        var path1b = storage.private.imageDestinationPath('T1', id1, true, { index: 0 } );
                        
                        assert( path1a.split('/').length > 3, 'path not looking right: ' + path1a);
                        assert(path1a != path1b, 'path1a expected to be different from path1b');

                        var path2 = storage.private.imageDestinationPath('T1', mongo.newObjectId(), true, { index: 0, size: { width: 256, height: 128 } } );
                        assert(path2.split('/').length > 3, 'path not looking right: ' + path2);
                    });

                it( 'storage.private.jsonDestinationPath',
                    function(){
                        var jsonPath = storage.private.jsonDestinationPath('T1', mongo.newObjectId() );

                        assert(jsonPath.split('/').length > 3, 'path not looking right: ' + jsonPath);
                    });
            } );

    } );
