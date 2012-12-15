
var		assert	= require("assert")

	,	a	= use("a")

	,	fb		= use('fb')
	,	photodb	= use('photodb')
	,	storage	= use('storage')

	,	Photo	= use('Photo')
	,	User	= use('User')
	,	FacebookAccess	= use('FacebookAccess')
	,	OperationQueue	= use('OperationQueue')
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


PhotoManager.prototype.addPhotoWithFacebookId = 
	function(fbId, success_f, error_f)
	{
		a.assert_fbId(fbId);
		a.assert_f(success_f);
		a.assert_f(error_f);

		var userId	= this._user.getFacebookId();
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
	    // Make sure it is not a duplicate, if so we abort
	    //



	    //
	    // Make Copy in S3
	    //      -> q.context.copyObject
	    //		-> q.context.photo
	    
	    q.add(
	        function MakeCopyInStorage(doneOp)
	        {
	            a.assert_def(q.context.facebookObject);

	            var photo = new Photo(true);
	            q.context.photo = photo;

	            assert( q.context.facebookObject.id == fbId,    
	                   'q.context.facebookObject.id:' + q.context.facebookObject.id + ' != fbId:' + fbId );

	            storage.copyFacebookPhoto(  userId
	            						,	photo.getId()
	            						,	q.context.facebookObject
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

				photodb.addPhoto(	userId
								,	photo
								,	function success(insertedPhoto)
									{
										q.context.insertedPhoto = insertedPhoto;
										doneOp();
									}
								,	function error(e)
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
	        error.source = srcError;

	        console.error(srcError.stack);

	        q.abort(error);
	    }

	};


PhotoManager.prototype.getPhotos = 
	function(succcess_f, error_f)
	{

	};


PhotoManager.prototype.deletePhoto = 
	function(aPhoto, succcess_f, error_f)
	{

	};

