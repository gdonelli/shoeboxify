
var     assert  = require("assert")

    ,   a   = use("a")

    ,   fb      = use('fb')
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
    function(fbId, success_f, error_f)
    {
        a.assert_fbId(fbId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var userId  = this._user.getFacebookId();
        var fbAccess= this._user.getFacebookAccess();
        
        var that = this;

        var q = new OperationQueue(1);

        q.context = {};
        // q.debug = true;

        q.on('abort', 
            function(e) {
                error_f(e);
            });

        //
        // Make sure it is not a duplicate, if so we just return it. 
        // We have nothing to do.
        //
        q.add(
            function CheckForDuplicateOperation(doneOp)
            {
                photodb.getPhotoWithFacebookId(
                            userId
                        ,   fbId
                        ,   function success(entry) 
                            {
                                if (entry != null)
                                {
                                    // We have the picture in the db already
                                    var photo = Photo.fromEntry(entry);
                                    success_f(photo);
                                    q.purge();                                  
                                }

                                doneOp();
                            }
                        ,   function error(e) {
                                _abort('photodb.getPhotoWithFacebookId failed for ' + fbId, e);
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

                var photo = new Photo(true);
                q.context.photo = photo;

                assert( q.context.facebookObject.id == fbId,    
                       'q.context.facebookObject.id:' + q.context.facebookObject.id + ' != fbId:' + fbId );

                storage.copyFacebookPhoto(  userId
                                        ,   photo.getId()
                                        ,   q.context.facebookObject
                                        ,   function success(theCopy) {
                                                q.context.copyObject = theCopy;
                                                doneOp();
                                            } 
                                        ,   function error(e){
                                                _abort('storage.copyFacebookPhoto failed for ' + fbId, e);
                                            } );
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

                photodb.addPhoto(   userId
                                ,   photo
                                ,   function success(insertedPhoto)
                                    {
                                        q.context.insertedPhoto = insertedPhoto;
                                        doneOp();
                                    }
                                ,   function error(e)
                                    {
                                        if (e.code == 11000)
                                            _abort('photodb.addPhoto failed because of a duplicate of ' + fbId, e);
                                        else
                                            _abort('photodb.addPhoto failed for ' + fbId, e);
                                    });
            });

        q.add(
            function Finish(doneOp)
            {
                Photo.assert(q.context.insertedPhoto);
              
                success_f( q.context.insertedPhoto );
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
    };


Class.PhotoManager.kNoEntryFoundCode = 'NO-ENTRY-FOUND';

PhotoManager.prototype.removePhoto = 
    function(photo, succcess_f, error_f)
    {
        Photo.assert(photo);
        a.assert_f(succcess_f);
        a.assert_f(error_f);

        var userId  = this._user.getFacebookId();
        var fbAccess= this._user.getFacebookAccess();
        
        var that = this;

        var q = new OperationQueue(1);

        q.context = {};

        q.on('abort', 
            function(e) {
                error_f(e);
            });

        //
        // Find photo in photodb
        //      -> q.context.photo
        q.add(
            function FindPhotoOperation(doneOp)
            {
                var photoId = photo.getId();

                photodb.getPhotoWithId(
                        userId
                    ,   photoId
                    ,   function success(photo)
                        {
                            if (photo == null) {
                                var err = new Error('Cannot find photo with Id: ' + photo.getId() );
                                err.code = Class.PhotoManager.kNoEntryFoundCode;
                                q.abort(err);
                            }
                            else {
                                q.context.photo = photo;
                                doneOp();
                            }
                        }
                    ,   function error(e) { q.abort(e); }
                    );
            });

        //
        // Delete from storage
        //
        q.add(
            function DeleteFromStorageOperation(doneOp)
            {
                var copyObject = q.context.photo.getCopyObject();

                storage.deleteFilesInCopyObject(
                        userId
                    ,   copyObject
                    ,   function success()
                        {
                            doneOp();
                        }
                    ,   function error(e) { q.abort(e); }
                    );

                
            });

        //
        // Delete from database
        //
        q.add(
            function DeleteFromDatabaseOperation(doneOp)
            {
                photodb.removePhoto(
                        userId
                    ,   q.context.photo
                    ,   function success()
                        {
                            doneOp();
                        }
                    ,   function error(e) { q.abort(e); }
                    );

                
            });

        //
        // End
        //
        q.add(
            function EndOperation(doneOp)
            {
                succcess_f();
                doneOp();
            });
    };


PhotoManager.prototype.getPhotos = 
    function(success_f /* (photos) */, error_f)
    {
        var userId  = this._user.getFacebookId();

        photodb.getAllPhotos(userId, success_f, error_f);
    };

