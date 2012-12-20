
var     assert  = require("assert")

    ,   a   = use("a")

    ,   fb      = use('fb')
    ,   fbutil  = use('fbutil')
    ,   photodb = use('photodb')
    ,   storage = use('storage')

    ,   Photo   = use('Photo')
    ,   User    = use('User')
    ,   FacebookAccess  = use('FacebookAccess')
    ,   OperationQueue  = use('OperationQueue')
    ;

// Should only need storage.js and database.js

var Class = exports;

Class.PhotoManager = PhotoManager;


function PhotoManager(user)
{
    User.assert(user);
    this._user = user;
}


Class.PhotoManager.assert = 
    function(pm)
    {
        a.assert_def(pm);
        a.assert_def(pm._user);
    }

Class.PhotoManager.fromRequest =
	function(quest)
    {
        var user = User.fromRequest(quest);
        return new PhotoManager(user);
    }

PhotoManager.prototype.addPhotoWithFacebookId = 
    function(fbId, callback /* (err, photo) */)
    {
        a.assert_fbId(fbId);
        a.assert_f(callback);

        var userId  = this._user.getId();
        var fbAccess= this._user.getFacebookAccess();
        
        var that = this;

        var q = new OperationQueue(1);

        q.context = {};
//        q.debug = true;

        //
        // Make sure it is not a duplicate, if so we just return it. 
        // We have nothing to do.
        //
        q.add(
            function CheckForDuplicateOperation(doneOp)
            {
                photodb.getPhotoWithFacebookId(userId, fbId,
                    function(err, entry)
                    {
                        if (err)
                            return _abort('photodb.getPhotoWithFacebookId failed for ' + fbId, err);
                        
                        if (entry != null)
                        {
                            // We have the picture in the db already
                            var photo = Photo.fromEntry(entry);
                            callback(null, photo);
                            q.purge();                                  
                        }

                        doneOp();
                    } );
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
        //      -> q.context.photo
        
        q.add(
            function MakeCopyInStorage(doneOp)
            {
                a.assert_def(q.context.facebookObject);

                var photo = new Photo(true); // we need the id to for the storage
                q.context.photo = photo;

                assert( q.context.facebookObject.id == fbId,    
                       'q.context.facebookObject.id:' + q.context.facebookObject.id + ' != fbId:' + fbId );

                storage.copyFacebookPhoto( userId
                    ,	photo.getId()
                    ,   q.context.facebookObject
                    ,   function(err, theCopy) {
                            if (err)
                                return _abort('storage.copyFacebookPhoto failed for ' + fbId, err);
                                                        
                            q.context.copyObject = theCopy;
                            doneOp();
                        });
            });

        //
        // Insert new photo in photodb
        //      -> q.context.insertedPhoto

        q.add(
            function InsertPhotoInDatabaseOperation(doneOp)
            {
                Photo.assert(q.context.photo);
                var photo = q.context.photo;
              
                photo.setSourceObject(q.context.facebookObject);
                photo.setCopyObject(q.context.copyObject);

                photodb.addPhoto(userId, photo,
                    function(err, insertedPhoto)
                    {
                        if (err) {
                            console.error(err);
                         
                            if (err.code == 11000)
                                _abort('photodb.addPhoto failed because of a duplicate of ' + fbId, err);
                            else
                                _abort('photodb.addPhoto failed for ' + fbId, err);
                 
                            return;
                        }
                 
                        q.context.insertedPhoto = insertedPhoto;
                        doneOp();
                    } );
            });

        q.add(
            function Finish(doneOp)
            {
                Photo.assert(q.context.insertedPhoto);
                callback(null, q.context.insertedPhoto );
                doneOp();
            });

        /* aux ==================== */

        function _abort(message, srcError)
        {
            // console.log(arguments.callee.name);

            var error = new Error(message);

            if (srcError) {
                error.source = srcError;
                console.error(srcError.stack);
            }

            q.abort(error);
        }
        
        q.on('abort',
            function(abortErr) {
                if (q.context.copyObject) // Remove copyObject
                {
                    storage.deleteFilesInCopyObject(userId, q.context.copyObject,
                        function(rollbackErr)
                        {
                            if (rollbackErr)
                            {
                                console.error('Storage roll back failed with error:');
                                console.error(rollbackErr.stack);
                            }
                            else
                                console.error('Storage roll back success');
                                
                            callback(abortErr);
                        });
                }
            });
        
        return q;
    };

/* types of photos:
 *		1: FacebookReplica, exact copy of a facebook photo
 *		2: FacebookPlaceholder, reference to a facebook photo we have no permission to get to yet
 *		3: GenericImage, any image data
 */

PhotoManager.prototype.addPhotoFromURL =
    function(theURL, callback)
    {
        a.assert_http_url(theURL);
        a.assert_f(callback);
        
        var fbid = fbutil.facebookIdForURL(theURL);

        if (fbid) // it is a Facebook object...
        {
//          console.log('addPhotoFromURL fbid:' + fbid);
            return this.addPhotoWithFacebookId(fbid, callback);
        }
        else
        {
            callback( new Error('Not supported yet') );
        }

    }

Class.PhotoManager.kNoEntryFoundCode = 'NO-ENTRY-FOUND';

PhotoManager.prototype.removePhoto = 
    function(photo, callback)
    {
        Photo.assert(photo);
        a.assert_f(callback);

        var userId  = this._user.getId();
        var fbAccess= this._user.getFacebookAccess();
        
        var that = this;

        var q = new OperationQueue(1);

        q.context = {};

        q.on('abort', 
            function(e) {
                callback(e);
            });

        //
        // Find photo in photodb
        //      -> q.context.photo
        q.add(
            function FindPhotoOperation(doneOp)
            {
                var photoId = photo.getId();

                photodb.getPhotoWithId(userId, photoId,
                    function(err, photo)
                    {
                        if (err)
                            return q.abort(err);
                            
                        if (photo == null) {
                            var err = new Error('Cannot find photo with Id: ' + photo.getId() );
                            err.code = Class.PhotoManager.kNoEntryFoundCode;
                            q.abort(err);
                        }
                        else {
                            q.context.photo = photo;
                            doneOp();
                        }
                    });
            });

        //
        // Delete from storage
        //
        q.add(
            function DeleteFromStorageOperation(doneOp)
            {
                var copyObject = q.context.photo.getCopyObject();
              
                a.assert_obj(copyObject);
              
                storage.deleteFilesInCopyObject( userId, copyObject,
                    function(err)
                    {
                        if (err)
                            q.abort(e);
                        else
                            doneOp();
                    } );
            });

        //
        // Delete from database
        //
        q.add(
            function DeleteFromDatabaseOperation(doneOp)
            {
                photodb.removePhoto(userId, q.context.photo,
                    function(err)
                    {
                        if (err)
                            return q.abort(err);
                        else
                            doneOp();
                    });

            });

        //
        // End
        //
        q.add(
            function EndOperation(doneOp)
            {
                callback();
                doneOp();
            });
    };

PhotoManager.prototype.getPhotoWithId =
    function(photoId, callback /* (err, photo) */)
    {
        var userId  = this._user.getId();

        return photodb.getPhotoWithId(userId, photoId, callback)
    };


PhotoManager.prototype.getPhotos = 
    function(callback /* (err, photos) */)
    {
        var userId  = this._user.getId();

        return photodb.getAllPhotos(userId, callback);
    };

PhotoManager.prototype.deleteAll =
    function(callback /* (err) */)
    {
        
    };
