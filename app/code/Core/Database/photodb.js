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
    function(userId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);
        
        var q = _newCollectionOperationQueue(userId, error_f);
        
        q.add(
            function SetupOperation(doneOp)
            {
                var collection = a.assert_def(q.context.collection);
              
                var propertyIndex = {};
                propertyIndex[Photo.FacebookIdKey] = 1;
    
                collection.ensureIndex(
                        propertyIndex
                    ,   { unique: true }
                    ,   function(err, indexName)
                        {
                            if (err) {
                                console.error('collection.ensureIndex for Photo.FacebookIdKey failed err:' + err);
                                q.abort(err);
                            }
                            else {
                                success_f();
                                doneOp();
                            }
                        } );
            });

        
    };

photodb.addPhoto =
    function(userId, photo, success_f /* (photo) */, error_f /* (e) */)
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(success_f);
        a.assert_f(error_f);

        photo[Photo.kCreatedDateKey] = new Date();

        _add(userId, photo, success_f, error_f);
    };

photodb.removePhoto =
    function(userId, photo, success_f /*()*/, error_f /* (e) */)
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var findOptions = _findOptionsWithPhotoId( photo.getId() );

        _remove(userId
        	,	findOptions
            ,	function success(numOfEntries)
                {
                    if (numOfEntries == 1)
                        success_f();
                    else
                        error_f( new Error('numOfEntries expected to be #1 is #' + numOfEntries) );
                }
            ,	error_f);
    }

photodb.getPhotoWithId =
    function(userId, photoId, success_f /* (photo) */, error_f)
    {
        a.assert_uid(userId);
        a.assert_def(photoId, 'photoId');
        a.assert_f(success_f);
        a.assert_f(error_f);

        var findOptions = _findOptionsWithPhotoId(photoId);

        _findOne(userId, findOptions, success_f, error_f);
    }

photodb.getPhotoWithFacebookId =
    function(userId, fbId, success_f /* (photo) */, error_f)
    {
        a.assert_uid(userId);
        a.assert_fbId(fbId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var findOptions = _findOptionsWithFacebookId(fbId);

        _findOne(userId, findOptions, success_f, error_f);    
    };

photodb.getAllPhotos =
    function(userId, success_f /* (photos) */, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        _findAll(userId, {}
            ,   function success(array) {
                    a.assert_array(array);
                    
                    var photos = _.map( array, 
                        function(entry) {
                            return Photo.fromEntry(entry);
                        } );

                    success_f(photos);
                }
            ,   error_f );
    };

photodb.removePhotoWithId =
    function(userId, photoId, success_f /* () */, error_f /* (err) */)
{
    a.assert_def(photoId, 'photoId');
    a.assert_f(success_f);

    var findOptions = _findOptionsWithPhotoId(photoId);

    _remove(userId
        ,   findOptions
        ,   function(num)
            {
                assert(num == 1, 'num of removed entries is #' + num + 'expected #1');
                success_f();
            } 
        ,   error_f );  
};

/* ====================================================== */
/* ====================================================== */
/* ======================= PRIVATE ====================== */
/* ====================================================== */
/* ====================================================== */


photodb._getCollection   = _getCollection;
photodb._add        = _add;
photodb._findOne    = _findOne;
photodb._findAll    = _findAll;
photodb._remove     = _remove;
photodb._drop       = _drop;

function _collectionName(userId)
{
    a.assert_uid(userId);

    return 'fbuser_' + userId + '_photo';
}

function _getCollection(userId, success_f, error_f)
{
    a.assert_uid(userId);
    a.assert_f(success_f);
    a.assert_f(error_f);
   
    var collectionName = _collectionName(userId);

    mongo.getCollection(collectionName
            ,   function success(c) { success_f(c); }
            ,   error_f );
}

// Returns a queue to build upon to manipulare collection
//              --> q.context.collection
//
function _newCollectionOperationQueue(userId, error_f)
{
    var result = new OperationQueue(1);
    
    result.context = {};
    
    result.on('abort',
        function(e) {
            error_f(e);
        });
    
    result.add(
        function GetCollectionOperation(doneOp){
            _getCollection( userId
                ,   function success(c) {
                        result.context.collection = c;
                        doneOp();
                    }
                ,   function error(e) {
                        result.abort(e);
                    });
        });
    
    return result;
}


function _add(userId, object, success_f /* (new_entity) */, error_f)
{
    a.assert_obj(object, 'object');

    _getCollection( 
            userId
        ,   function success(c) {
                mongo.add(c, object, success_f, error_f);
            }
        ,   error_f );
}

function _findOne(userId, findProperties, success_f /* (photo) */, error_f)
{
    a.assert_obj(findProperties, 'findProperties');
    a.assert_f(success_f);
    a.assert_f(error_f);

    _getCollection(
            userId
        ,   function success(c) 
            {
                mongo.findOne(
                        c
                    ,   findProperties
                    ,   function success(entry)
                        {   
                            var photo;

                            if (entry)
                                photo = Photo.fromEntry(entry);
                            else
                                photo = null;

                            success_f(photo);
                        }
                    ,   error_f );
            }
        ,   error_f );
}

function _findAll(userId, findProperties, success_f, error_f)
{
    a.assert_obj(findProperties, 'findProperties');
    a.assert_f(success_f);
    a.assert_f(error_f);

    _getCollection( 
            userId
        ,   function success(c) { mongo.findAll(c, findProperties, success_f, error_f); }
        ,   error_f);
}

function _remove(userId, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
{
    a.assert_obj(findProperties, 'findProperties');
    a.assert_f(success_f);
    a.assert_f(error_f);

    _getCollection( 
            userId
        ,   function success(c) { mongo.remove(c, findProperties, success_f, error_f, options); }
        ,   error_f);
} 

function _drop(userId, success_f, error_f)
{
    _getCollection( 
            userId
        ,   function success(c) { mongo.drop(c, success_f, error_f); }
        ,   error_f);
}

function _findOptionsWithFacebookId(fbId)
{
    var result = {};
    result[Photo.kFacebookIdKey] = mongo.LongFromString(fbId);
    return result;
}

function _findOptionsWithPhotoId( photoIdOrString )
{
    var result = {};

    if ( _.isString(photoIdOrString) )
    {
        result[Photo.kIdKey] = new ObjectID(photoIdOrString);
    }
    else
    {
        Photo.assertId(photoIdOrString);

        result[Photo.kIdKey] = photoIdOrString;
    }

    return result;
}



