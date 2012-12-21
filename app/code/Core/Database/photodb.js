/*

=======================[   Photo DB   ]=======================
Database based on mongo module

API:

================================================================

*/

var     assert  = require('assert')
    ,   _       = require('underscore')

    ,   a               = use('a')
    ,   mongo           = use('mongo')
    ,   OperationQueue  = use('OperationQueue')
    ,   Photo           = use('Photo')
    ;


var photodb = exports;

photodb.setup = 
    function(userId, callback /* (err) */ )
    {
        a.assert_uid(userId);
        a.assert_f(callback);
        
        _getPhotoCollection( userId,
           function(err, collection) {
                if (err)
                    return callback(err);
                
                var propertyIndex = {};
                propertyIndex[Photo.k('FacebookIdKey')] = 1;
    
                collection.ensureIndex(
                        propertyIndex
                    ,   { unique: true }
                    ,   function(err, indexName)
                        {
                            callback(err);
                        });
            });
    };

photodb.addPhoto =
    function(userId, photo, callback /* (err, photo) */ )
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(callback);

        _getPhotoCollection( userId,
            function(err, collection) {
                if (err)
                    return callback(err);
                
                photo[Photo.k('CreatedDateKey')] = new Date();
       
                mongo.add(collection, photo, callback);
            } );
    };

photodb.removePhoto =
    function(userId, photo, callback /* (err) */ )
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(callback);

        var findOptions = _findOptionsWithPhotoId( photo.getId() );

        _getPhotoCollection( userId,
            function(err, collection) {
                if (err)
                    return callback(err);
                            
                mongo.remove(collection, findOptions,
                    function(err, numOfEntries)
                    {
                        if (err)
                            return callback(err);
                    
                        if (numOfEntries == 1)
                            callback(null);
                        else
                            callback( new Error('numOfEntries expected to be #1 is #' + numOfEntries) );
                    });
            });
    };

photodb.getPhotoWithId =
    function(userId, photoId, callback /* (err, photo) */)
    {
        var findOptions = _findOptionsWithPhotoId(photoId);

        _findOne(userId, findOptions, callback);
    };

photodb.getPhotoWithFacebookId =
    function(userId, fbId, callback /* (err, photo) */)
    {
        var findOptions = _findOptionsWithFacebookId(fbId);

        _findOne(userId, findOptions, callback);
    };

photodb.getAllPhotos =
    function(userId, callback /* (err, photos) */)
    {
        a.assert_uid(userId);
        a.assert_f(callback);
        
        _getPhotoCollection( userId,
            function(err, collection) {
                if (err)
                    return callback(err);

                mongo.findAll(collection, {},
                    function(err, items){
                        if (err)
                            return callback(err);
            
                        a.assert_array(items);
                        
                        var photos = _.map( items,
                            function(entry) {
                                return Photo.fromEntry(entry);
                            } );

                        callback(null, photos);
                    });
            });
    };

photodb.removePhotoWithId =
    function(userId, photoId, callback /* (err) */ )
    {
        a.assert_uid(userId);
        a.assert_def(photoId, 'photoId');
        a.assert_f(callback);

        var findOptions = _findOptionsWithPhotoId(photoId);
        
        _getPhotoCollection( userId,
            function(err, collection) {
                if (err)
                    return callback(err);
        
                mongo.remove(c, findProperties,
                    function(err, num) {
                        if (err)
                            return callback(err);

                        assert(num == 1, 'num of removed entries is #' + num + 'expected #1');
                        callback(null);
                    }
                    ,   options);
            });
    };


photodb.drop =
    function(userId, callback /* (err) */ )
    {
        a.assert_uid(userId);
        a.assert_f(callback);
    
        _getPhotoCollection( userId,
            function(err, collection) {
                if (err)
                    return callback(err);
            
                mongo.drop(collection, callback);
            });
    }

/* ====================================================== */
/* ====================================================== */
/* ======================= PRIVATE ====================== */
/* ====================================================== */
/* ====================================================== */

function ___PRIVATE___(){}

photodb._getPhotoCollection = _getPhotoCollection;
photodb._findOne        	= _findOne;

function _collectionName(userId)
{
    a.assert_uid(userId);

    return 'fbuser_' + userId + '_photo';
}

function _getPhotoCollection(userId, callback /* (err, collection) */)
{
    a.assert_uid(userId);
    a.assert_f(callback);
   
    var collectionName = _collectionName(userId);

    mongo.getCollection(collectionName, callback);
}

function _findOne(userId, findProperties, callback /* (err, photo) */)
{
    a.assert_uid(userId);
    a.assert_obj(findProperties, 'findProperties');
    a.assert_f(callback);

    _getPhotoCollection( userId,
        function(err, c)
        {
            if (err)
                return callback(err);
                
            mongo.findOne( c
                ,   findProperties
                ,   function(err, entry) {
                        if (err)
                            return callback(err);
                        
                        var photo;

                        if (entry)
                            photo = Photo.fromEntry(entry);
                        else
                            photo = null;

                        callback(null, photo);
                    } );
        } );
}

function _findOptionsWithFacebookId(fbId)
{
    var result = {};
    result[ Photo.k('FacebookIdKey') ] = mongo.LongFromString(fbId);
    return result;
}

function _findOptionsWithPhotoId( photoIdOrString )
{
    var result = {};

    if ( _.isString(photoIdOrString) )
    {
        result[ Photo.k('IdKey') ] = new ObjectID(photoIdOrString);
    }
    else
    {
        Photo.assertId(photoIdOrString);

        result[ Photo.k('IdKey') ] = photoIdOrString;
    }

    return result;
}



