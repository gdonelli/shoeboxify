/*

========================[   Memento   ]========================

Memento rappresent a user memory/entry (example: a photo). 
It corresponds to some data stored in S3 and some meta-data 
stored in the Mongo DB.

The Memento module abstracts from the accessing directly the 
mongo db (mongo.js) and manipulation on amazon S3 (s3.js)

Setup:
            memento.init
            memento.initUser

Operations:
            memento.removeId
            memento.findId
            memento.addFacebookObject
            memento.addURL
Utils:
            memento.facebookIdForURL

================================================================

*/

var     assert  = require('assert') 
    ,   path    = require('path')
    ,   http    = require('http')
    ,   https   = require('https')
    ,   url     = require('url')
    ,   fs      = require('fs')
    ,   _       = require('underscore')
    
    ,   a   = use('a')
    ,   fb  = use('fb')
    ,   s3  = use('s3') // FIXME: need to get rid of S3 dependency, use only storage
    ,   storage = use('storage')

    ,   mongo   = use('mongo')
    ,   handy   = use('handy')
    ,   imageshop       = use('imageshop')
    ,   OperationQueue  = use('OperationQueue')
    ,   FacebookAccess  = use('FacebookAccess')
    ;


var memento = exports;

memento.init =
    function(success_f, error_f)
    {
        mongo.init(
            function success(c) {
                assert(c != undefined, 'mongo.init returned undefined collection');

                if (success_f)
                    success_f();
            }
        ,   function error(e) {
                if (error_f)
                    error_f(e);
            } );
    };

memento.user = {};

memento.initUser =
    function(userId, success_f, error_f)
    {
        assert( userId != undefined, 'userId is undefined');
        a.assert_f(success_f, false);
        a.assert_f(error_f, false);

        mongo.memento.init(userId
            ,   function success(collection) {
                    assert(collection != undefined, 'user collection is undefined');
                    if (success_f)
                        success_f();
                }
            ,   function error(e) {
                    if (error_f)
                        error_f(e);
                } );
    };

memento.removeId =
    function(userId, mongoId, success_f /* ( elapsedTime ) */, error_f /* (error) */)
    {
        assert( userId != undefined, 'userId is undefined');
        assert( mongoId != undefined, 'userId is undefined');
        a.assert_f(success_f);
        a.assert_f(error_f);
        var startTimestamp = new Date();

        mongo.memento.findId(userId, mongoId
            ,   function success(entry) 
                {
                    assert(entry != undefined, 'found entry is undefined');
                    _remove(entry);
                }
            ,   function error(e)
                {
                    console.error('mongo.memento.findId failed ' + e );
                    error_f(e); 
                } 
            );

        /* =================================================== */
        
        function _remove(entry)
        {
            mongo.memento.removeId(userId, mongoId
                ,   function mongoSuccess() {
                        _deleteFilesFromS3(entry
                            ,   function s3success() 
                                {
                                    success_f(handy.elapsedTimeSince(startTimestamp));
                                }
                            ,   function s3error(e)
                                {
                                    console.error('_deleteFilesFromS3 failed ' + e );
                                    error_f(e);
                                });
                    }
                ,   function mongoError(e) {
                        console.error('mongo.memento.removeId failed ' + e );
                        error_f(e);
                    });         
        }

        function _getCopyURLsForPhotoEntry(entry)
        {
            var result = [];
            var copyObject = mongo.memento.entity.getCopyObject(entry);

            result.push(copyObject.picture);
            result.push(copyObject.source);

            for (var i in copyObject.images)
                result.push(copyObject.images[i].source);

            return result;
        }

        function _deleteFilesFromS3(entry, success_f, error_f)
        {
            // we only know how to deal with photo objects
            var entryType = mongo.memento.entity.getType(entry);
            assert(entryType == mongo.k.MementoPhotoType, 'found entry is not mongo.k.MementoPhotoType is ' + entryType);

            var photoURLs = _getCopyURLsForPhotoEntry(entry);
            assert(photoURLs.length > 0 , 'photoURLs.length expected to be > 0');

            var info = s3.getInfoForURLs(photoURLs);

            var s3client = s3.getClient(info.bucket, 'RW');

            s3.delete(s3client, info.paths
                ,   function success(num) {
                        // console.log('removed ' +  num + ' s3 files');
                        success_f();
                    } 
                ,   function error(e) {
                        error_f(e);
                    } );
        }

    };


memento.findId =
    function(userId, mongoId, success_f /* (entry) */, error_f /* (error) */)
    {
        mongo.memento.findId(userId, mongoId, success_f, error_f);
    };


memento.addFromURL =
    function(fbAccess, userId, theURL, success_f /* (newEntry, meta) */, error_f)
    {
        var fbid = memento.facebookIdForURL(theURL);

        if (fbid) // it is a Facebook object...
        {
            return memento.addFacebookObject(fbAccess, userId, fbid, success_f, error_f);
        }
        else
        {
            return _copyGenericURLToS3(userId, theURL, success_f, error_f);
        }
    }


function _copyGenericURLToS3(userId, theURL, success_f /* (newEntry, meta) */, error_f)
{
    var q = new OperationQueue(1);

    q.context = {};

    q.on('abort',
        function(e) {
            if (error_f)
                error_f(e); 
        });
    
    // Download image locally
    //      -> q.context.downloadedPath
    q.add(
        function DownloadOperation(doneOp) {
            console.log(arguments.callee.name);

            handy.downloadImageURL( 
                    theURL
                ,   function success(localPath) { 
                        q.context.downloadedPath = localPath;
                        console.log('image downloaded: ' + localPath);
                        doneOp();
                    }
                ,   function error(e){  q.abort(e); }
                );
        });
    
    // Resample original image
    //      ->  q.context.original = {path, size}

    q.add(
        function ResampleOperation(doneOp) {
            console.log(arguments.callee.name);

            imageshop.resample(
                    q.context.downloadedPath
                ,   imageshop.k.DefaultResampleOptions
                ,   function success(outPath, outSize) {
                        
                        q.context.original = {};
                        q.context.original.path = outPath;
                        q.context.original.size = outSize;

                        console.log('original: ' + outPath);
                        doneOp();
                    }   
                ,   function error(e){ q.abort(e); }
                );
        });

    // Make thumbnails
    //      ->  q.context.thumbnails = [ {path, size}, ... ]
    q.add( 
        function MakeThumbnails(doneOp) {
            console.log(arguments.callee.name);

            imageshop.createThumbnails(
                    q.context.original.path
                ,   q.context.original.size
                ,   function success(array){
                        q.context.thumbnails = array;
                        // console.log('thumb array: ');
                        // console.log(array);
                        doneOp();
                    }
                ,   function error(e){ q.abort(e); }
                );
        });

    // Upload images to S3
    //      -> q.context.uploaded = [ { path, size, s3path, URL }, ... ]

    q.add( 
        function UploadToS3(doneOp) {
            console.log(arguments.callee.name);
            q.context.uploaded = _.union( [ q.context.original ], q.context.thumbnails);

            var s3client = s3.test.clientRW();

            for ( var i in q.context.uploaded )
            {
                var fileInfo = q.context.uploaded[i];
                assert(fileInfo != undefined, 'fileInfo is undefined');
                assert(fileInfo.path != undefined, 'fileInfo.path is undefined');
                assert(fileInfo.size != undefined, 'fileInfo.size is undefined');

                var extension = path.extname(fileInfo.path);
                var s3path = _generateFilePath( path.basename(fileInfo.path, extension), i, fileInfo.size, extension );

                _copyFileInfo(fileInfo, s3path);
            }

            /* aux ==== */

            var successCount = 0;
            var errorCount = 0;

            function _copyFileInfo(theFileInfo, s3path)
            {
                s3.copyFile( s3client, theFileInfo.path, s3path
                    ,   function success(byteLen)
                        {
                            theFileInfo.s3path = s3path;
                            theFileInfo.URL = s3client.URLForPath(s3path);
                            successCount++;
                            _checkDone();
                        }
                    ,   function error(e)
                        {
                            theFileInfo.error = e;  
                            errorCount++;
                            _checkDone();
                        } );
            }

            function _checkDone()
            {
                if (successCount + errorCount >= q.context.uploaded.length)
                {
                    if (errorCount == 0)
                        doneOp();
                    else
                        q.abort(e);
                }
            }

            
        });


    // Make entry

    
    // Clean up


    // Done!
    q.add(
        function SuccessOperation()
        {
            console.log(arguments.callee.name);

            if (success_f)
                success_f(q.context, undefined);
        }   );
}


function _postProcessImage(aPath, success_f, error_f)
{
    a.assert_f(success_f);
    a.assert_f(error_f);

    imageshop.getSize(aPath
        ,   function success(size) {
                success_f(size);
            }
        ,   function error(e) { 
                error_f(e);
            } );
}


/* ========================================================== */
/* ========================================================== */
/* ========================[  Add  ]========================= */
/* ========================================================== */
/* ========================================================== */

function _addFacebookObject(fbAccess, userId, fbId, success_f /* (newEntry, meta) */, error_f)
{
    var q = new OperationQueue(1);

    q.context = {};
    // q.debug = true;

    var newObjectId = mongo.newObjectId();

    q.on('abort', 
        function(e) {
            error_f(e);
        });

    //
    // Fetch Facebook Object
    //      -> q.context.facebookObject
    
    q.add(
        function FetchFacebookObjectOperation(doneOp)
        {
            // console.log(arguments.callee.name);

            fb.graph(   fbAccess
                    ,   fbId
                    ,   function success(fbObject) {
                            if ( !fbObject.picture || !fbObject.images) // validate that is a photo
                                _abort('fbObject:' + fbId + ' is not an photo');    
                            else 
                            {
                                q.context.facebookObject = fbObject;                    
                                doneOp();
                            }

                        }
                    ,   function error(e) {
                            _abort('fb.graph failed for ' + fbId, e);
                        } );
        });

    //
    // Make Copy in S3
    //      -> q.context.copyObject
    
    q.add(
        function MakeCopyInStorage(doneOp)
        {
            a.assert_def(q.context.facebookObject);

            assert( q.context.facebookObject.id == fbId,    
                   'q.context.facebookObject.id:' + q.context.facebookObject.id + ' != fbId:' + fbId );

            storage.copyFacebookPhoto(  userId, newObjectId, q.context.facebookObject
                                    ,   function success(theCopy) {
                                            q.context.copyObject = theCopy;
                                            doneOp();
                                        } 
                                    ,   function error(e){
                                            _abort('storage.copyFacebookPhoto failed for ' + fbId, e);
                                        } );
        });

    //
    // Insert new entry in our Mongo DB
    //      -> q.context.newEntry

    q.add(
        function AddNewEntryToMongo(doneOp)
        {
            // console.log(arguments.callee.name);

            a.assert_def(q.context.copyObject);
            
            mongo.memento.addFacebookObject(
                    userId
                ,   fbId
                ,   q.context.facebookObject
                ,   q.context.copyObject 
                ,   function success(r)
                    {
                        q.context.newEntry = r;
                        doneOp();
                    }
                ,   function error(e)
                    {
                        _abort('mongo.memento.addFacebookObject for ' + fbId, e);
                    }
                );
        });

    q.add(
        function Finish(doneOp)
        {
            // console.log(arguments.callee.name);

            a.assert_def(q.context.newEntry);

            // console.log(q.context.newEntry);

            success_f( q.context.newEntry, {} );
            doneOp();
        });

    /* aux ==================== */

    function _abort(message, srcError)
    {
        // console.log(arguments.callee.name);

        var error = new Error(message);
        error.source = srcError;

        q.abort(error);
    }

}

memento.addFacebookObject =
    function(fbAccess, userId, fbId, success_f /* (newEntry, meta) */, error_f)
    {
        a.assert_def(userId);
        a.assert_fbId(fbId);
        FacebookAccess.assert(fbAccess);
        a.assert_f(success_f);
        a.assert_f(error_f);

        mongo.memento.findOneFacebookObject( 
                userId 
            ,   fbId
            ,   function success(r) {
                    if (r == null)
                    {
                        // The object is not present in the DB. Let's add a new entry...
                        _addFacebookObject(fbAccess, userId, fbId, success_f, error_f);
                    }
                    else 
                    {
                        // Object already in the mongo database!
                        success_f( r, { already: true } );
                    }
                }
            ,   function error(e) 
                {
                    var error = new Error('mongo.memento.findOneFacebookObject failed');
                    error.source = e;
                    error_f(error);
                } );
    };



function _generatePhotoName(ownerID, photoID, version, type)
{
    return ownerID + '_' + version + '_' + type + '_' + photoID;
}

function _generateFilePath(photoName, index, options, extension /* withLeadingDot */)
{
    var directory = 'picture'; // default directory

    var DEFAULT_IMAGE_SIZES = [ 2048, 960, 720, 600, 480, 320, 240, 180, 130 ];

    if (options && options.width && options.height)
    {
        var imageDimension = Math.max(options.width, options.height);       
            
        for (var i in DEFAULT_IMAGE_SIZES)
        {
            var size_i = DEFAULT_IMAGE_SIZES[i];

            if ( imageDimension >= size_i ) {
                directory = size_i.toString();
                break;
            }
        }
    }

    var now = new Date();
    var datePiece = now.getUTCFullYear() + 'M' + now.getUTCMonth() + 'D' + now.getUTCDate() + 'H' + now.getUTCHours() + 'M' + now.getUTCMinutes();
    
    var finalFileName = photoName + '_' + datePiece + '_i' + index;

    return '/' + directory + '/' + finalFileName + extension;
}


/* ====================================================== */
/* ====================================================== */
/* ====================[   Utils   ]===================== */
/* ====================================================== */
/* ====================================================== */


/*
 * Will extract the facebook ID from a URL if present
 * returns undefined if none is found.
 */
memento.facebookIdForURL =
    function( theURL )
    {
        if (theURL.startsWith('http'))
        {
            // https://www.facebook.com/photo.php?fbid=426454000747131&set=a.156277567764777.33296.100001476042600&type=1&ref=nf

            if (theURL.indexOf('photo.php?') > 0 && theURL.indexOf('fbid=') > 0 )
            {
                var stringElements = url.parse(theURL, true);
                var stringQuery = stringElements['query'];
                var fbid = stringQuery['fbid'];

                return fbid;
            }

            // https://sphotos-b.xx.fbcdn.net/hphotos-ash3/599016_10151324834642873_1967677028_n.jpg
            
            var last4chars = theURL.substring((theURL.length-4), theURL.length );

            if ( last4chars == '.jpg')
            {
                var theURLSplitElements = theURL.split('/');

                var lastPathComponent = theURLSplitElements[theURLSplitElements.length-1];

                var numbers = lastPathComponent.split('_');

                var isnum0 = numbers[0].isNumber();
                var isnum1 = numbers[1].isNumber();
                var isnum2 = numbers[2].isNumber();

                if (isnum0 && isnum1 && isnum2)
                    return numbers[1];
            }
        }

        return undefined;
    }

