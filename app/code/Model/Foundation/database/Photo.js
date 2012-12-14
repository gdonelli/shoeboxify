
var   		a		= use('a')
		,	mongo	= use('mongo')
		;


var Class = exports;

Class.Photo = Photo;

//
// Konstants
//

var kIdKey         		= '_id';
var kFacebookIdKey      = 'fb_id';
var kFacebookUserIdKey  = 'fb_userid';
var kSourceObjectKey    = 'source';
var kCopyObjectKey      = 'copy';
var kCreateDateKey      = 'created';
var kPhotoTypeKey       = 'type';
var kPhotoType          = 1;

Class.Photo.kIdKey       		= kIdKey;
Class.Photo.kFacebookIdKey    	= kFacebookIdKey;
Class.Photo.kFacebookUserIdKey	= kFacebookUserIdKey;
Class.Photo.kSourceObjectKey  	= kSourceObjectKey;
Class.Photo.kCopyObjectKey     	= kCopyObjectKey;
Class.Photo.kCreateDateKey     	= kCreateDateKey;
Class.Photo.kPhotoTypeKey      	= kPhotoTypeKey;
Class.Photo.kPhotoType         	= kPhotoType;


function Photo(photoId, fbObject, copyObject)
{
	if (photoId == true)
		this.setId( mongo.newObjectId() );
	else if (typeof photoId == 'object')
		this.setId(photoId);
	else if (photoId == undefined) {}
	else
		throw new Error('dont know what to do with photoId');

	if (fbObject)
		this.setSourceObject(fbObject);
		
	if (copyObject)
		this.setCopyObject(copyObject);

	return this;
};


//
// Class
//


Class.Photo.assert =
	function(photo)
	{
		a.assert_def(photo, 		'photo undefined' );
		a.assert_def(photo[kIdKey], 'photo is not valid (_id missing)' );
		a.assert_def(typeof photo.getId == 'function',	'photo is not valid (photo.getId not there)' );
	};

Class.Photo.assertId =
	function(value)
	{
	    a.assert_def(value,             'value');
	    a.assert_def(value._bsontype,   'value._bsontype');
	    a.assert_def(value.id,          'value.id');
	};	

Class.Photo.fromEntry =
	function(value)
	{
		var result = new Photo();

		var valueKeys = Object.keys(value);

		for (var i in valueKeys)
		{
			var key_i = valueKeys[i];

			result[key_i] = value[key_i];
		}

		return result;
	};

// 
// Photo
//

Photo.prototype.getId =
	function()
	{
		return this[kIdKey];
	};

Photo.prototype.setId =
	function(value)
	{
		exports.Photo.assertId(value);

		this[kIdKey] = value;
	};

// SourceObject

Photo.prototype.getFacebookId =
	function()
	{
		return this[kFacebookIdKey];
	};

Photo.prototype.getSourceObject =
	function()
	{
		return this[kSourceObjectKey];
	};

Photo.prototype.setSourceObject =
	function(value)
	{
		this[kSourceObjectKey]	= value;

		var fbId = value.id;
        a.assert_fbId(fbId);

		this[kFacebookIdKey] = mongo.LongFromString(fbId);
	};

// CopyObject

Photo.prototype.getCopyObject =
	function()
	{
		return this[kCopyObjectKey];
	};

Photo.prototype.setCopyObject =
	function(value)
	{
		this[kCopyObjectKey] = value;
	};
