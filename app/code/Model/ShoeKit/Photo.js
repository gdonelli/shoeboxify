
var   		a       = use('a')
		,	photodb = use('photodb')
		;


exports.Photo = Photo;

function Photo(	photoId
			,	fbObject
			,	copyObject)
{
	if (photoId)
		this.setPhotoId(photoId);

	if (fbObject)
		this.setSourceObject(fbObject);
		
	if (copyObject)
		this.setCopyObject(copyObject);

	return this;
}

exports.Photo.assert =
	function(photo)
	{
		a.assert_def(photo);
		a.assert_def(photo[photodb.k.PhotoIdKey]);
	}

// PhotoId

Photo.prototype.photoId =
	function()
	{
		return this[photodb.k.PhotoIdKey];
	};

Photo.prototype.setPhotoId =
	function(value)
	{
		this[photodb.k.PhotoIdKey] = value;
	};

// SourceObject

Photo.prototype.facebookId =
	function()
	{
		return this[photodb.k.FacebookIdKey];
	};

Photo.prototype.sourceObject =
	function()
	{
		return this[photodb.k.SourceObjectKey];
	};

Photo.prototype.setSourceObject =
	function(value)
	{
		this[photodb.k.SourceObjectKey]	= value;

		var fbId = value.id;
        a.assert_fbId(fbId);

		this[photodb.k.FacebookIdKey]	= mongo.LongFromString(fbId);
	};

// CopyObject

Photo.prototype.copyObject =
	function()
	{
		return this[photodb.k.CopyObjectKey];
	};

Photo.prototype.setCopyObject =
	function(value)
	{
		this[photodb.k.CopyObjectKey] = value;
	};
