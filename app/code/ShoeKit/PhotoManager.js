
var		assert	= require("assert")

	,	a	= use("a")

	,	fb		= use('fb')
	,	photodb	= use('photodb')
	,	storage	= use('storage')
	,	Photo	= use('Photo')

	,	FacebookAccess	= use('FacebookAccess')
	,	OperationQueue	= use('OperationQueue')
	;

// Should only need storage.js and database.js

exports.PhotoManager = PhotoManager;


function PhotoManager(user)
{
	User.assert(user);
	this.user = user;
}



PhotoManager.prototype.addFacebookPhoto = 
	function(fbAccess, fbId, succcess_f, error_f)
	{
		FacebookAccess.assert(fbAccess);
		a.assert_fbId(fbId);
		a.assert_f(succcess_f);
		a.assert_f(error_f);

		that = this;
		var userId = that.user.facebookId();

	    var q = new OperationQueue(1);

	    q.context = {};
	    // q.debug = true;

	    var newPhotoId = mongo.newObjectId();

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

	            storage.copyFacebookPhoto(  userId
	            						,	newPhotoId
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
	    //      -> q.context.newPhoto

	    q.add(
	        function InsertPhotoInDatabaseOperation(doneOp)
	        {
	            // console.log(arguments.callee.name);

	            a.assert_def(q.context.copyObject);
	            
	            var newPhoto = new Photo(	newPhotoId
	            						,	q.context.facebookObject
	            						,	q.context.copyObject );

	            photodb.addPhoto(	userId
	            				,	newPhoto
	            				,	function success(aPhoto)
	            					{
	            						q.context.newPhoto =  aPhoto;
	            					}
	            				,	function error(e)
	            					{
	            						_abort('photodb.addPhoto failed for ' + fbId, e);
	            					});
	        });

	    q.add(
	        function Finish(doneOp)
	        {
	            a.assert_def(q.context.newPhoto);
	            success_f( q.context.newPhoto );
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

	};



PhotoManager.prototype.photos = 
	function(succcess_f, error_f)
	{

	};

PhotoManager.prototype.photoWithFacebookId = 
	function(fbId, succcess_f, error_f)
	{
		
	};

PhotoManager.prototype.deletePhoto = 
	function(aPhoto, succcess_f, error_f)
	{

	};

