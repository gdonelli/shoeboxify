
var   		assert	= require('assert')

		,	a		= use('a')
		,	mongo	= use('mongo')
		;


var Class = exports;

Class.Photo = Photo;

//
// Konstants
//
Class.Photo.constants = {
    
    /* ===  KEYS  === */
    
            IdKey:              '_id'
        ,   FacebookIdKey:      'fb_id'
        ,   SourceObjectKey:    'source'
        ,   CopyObjectKey:      'copy'
        ,   CreatedDateKey:     'created'
        ,   PhotoTypeKey:       'type'
    
    /* ===  TYPES  === */
    
        ,   FacebookReplicaType:        1
        ,   FacebookPlaceholderType:    2
        ,   GenericImageType:           3

	};

Class.Photo.k = function(constantName) {
        return use.lib.k(Class.Photo, constantName);
    }

// possible inputs:
//  	- (true): creates a new Photo
//      - (id, sourceObject, copyObject)
//		- (stringId): creates a photo with a 

function Photo( arg0Id, sourceObject, copyObject)
{
    if (arg0Id) {
        if (arg0Id === true)
            this.setId( mongo.newObjectId() );
        else if (typeof argId === 'string')
            this.setId( mongo.newObjectId(arg0Id) );
        else
            this.setId(arg0Id);
    }
    
    if (sourceObject)
        this.setSourceObject(sourceObject);
    
    if (copyObject)
        this.setCopyObject(copyObject);
    
}

//
// Class
//


Class.Photo.assert =
	function(photo)
	{
		a.assert_def(photo, 'photo undefined' );
		a.assert_def(photo[ Photo.k('IdKey') ], 'photo is not valid Photo object (_id method missing)'  );
		assert(typeof photo.getId == 'function', 'photo is not valid Photo object (getId method missing)' );
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
		return this[ Photo.k('IdKey') ];
	};

Photo.prototype.setId =
	function(value)
	{
		exports.Photo.assertId(value);

		this[ Photo.k('IdKey') ] = value;
	};

// SourceObject

Photo.prototype.getSourceObject =
	function()
	{
		return this[ Photo.k('SourceObjectKey') ];
	};

Photo.prototype.setSourceObject =
	function(value)
	{
		this[ Photo.k('SourceObjectKey') ]	= value;

		var fbId = value.id;
        a.assert_fbId(fbId);

		this[ Photo.k('FacebookIdKey') ] = mongo.LongFromString(fbId);
	};

Photo.prototype.getFacebookId =
	function()
	{
		return this[ Photo.k('FacebookIdKey') ];
	};

// CopyObject

Photo.prototype.getCopyObject =
	function()
	{
		return this[ Photo.k('CopyObjectKey') ];
	};

Photo.prototype.setCopyObject =
	function(value)
	{
		this[ Photo.k('CopyObjectKey') ] = value;
	};

// CreatedDate

Photo.prototype.getCreatedDate =
	function()
	{
		return this[ Photo.k('CreatedDateKey') ];
	};

