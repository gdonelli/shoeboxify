
var		assert	= require("assert")

	,	handy	= require("./handy")
	
	,	OperationQueue	= require("./operation").queue

// Foundation:
	,	database = require("./database")
	,	storage	 = require("./storage")
	;

// Should only need storage.js and database.js

exports.PhotoManager = PhotoManager;


function PhotoManager(user)
{
	this.user = user;
}


PhotoManager.prototype.addPhotoWithFacebookId = 
	function(fbId, succcess_f, error_f)
	{
		var newPhotoId = database.newObjectId();

		var q = new OperationQueue(1);

		q.add( 
			function AddPhotoToStorageOperation );
		storage.copyFacebookPhoto( this.userId, );


		return newPhotoId;
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
	function(photoObject, succcess_f, error_f)
	{

	};

