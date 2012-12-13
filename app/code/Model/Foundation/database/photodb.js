/*

=======================[   Database   ]=======================
Database based on mongo module

API:
            photodb.init
            photodb.newPhotoId
            photodb.addFacebookPhoto
            photodb.removeFacebookPhoto

================================================================

*/

var     assert  = require('assert')
    ,   _       = require('underscore')

    ,   a               = use('a')
    ,   mongo           = use('mongo')
    ,   OperationQueue  = use('OperationQueue')
    ;

var photodb = exports;


// Konstants

photodb.k = {};

var kPhotoIdKey         = '_id';
var kFacebookIdKey      = 'fb_id';
var kFacebookUserIdKey  = 'fb_userid';
var kSourceObjectKey    = 'source';
var kCopyObjectKey      = 'copy';
var kCreateDateKey      = 'created';
var kPhotoTypeKey       = 'type';
var kPhotoType          = 1;

photodb.k.PhotoIdKey        = kPhotoIdKey;
photodb.k.FacebookIdKey     = kFacebookIdKey;
photodb.k.FacebookUserIdKey = kFacebookUserIdKey;
photodb.k.SourceObjectKey   = kSourceObjectKey;
photodb.k.CopyObjectKey     = kCopyObjectKey;
photodb.k.CreateDateKey     = kCreateDateKey;
photodb.k.PhotoTypeKey      = kPhotoTypeKey;
photodb.k.PhotoType         = kPhotoType;

// API

photodb.init = 
    function(userId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var q = new OperationQueue(1);

        q.on('abort',
            function(e) {
                error_f(e);
            } );

        // Establish main connection to Mongo DB if needed
        if (mongo.db == undefined) {
            q.add(
                function MongoInitOperation(doneOp)
                {
                    mongo.init( function success() { doneOp();      }
                            ,   function error(e)  { q.abort(e);    } );
                } );
        }

        // Init User photodb
        q.add(  
            function UserPhotoDBInitOperation(doneOp)
            {              
                _setupCollection(
                            userId
                        ,   function success() { doneOp();      }
                        ,   function error(e)  { q.abort(e);    } );
            } );

        q.add(
            function End(doneOp)
            {
                success_f();
                doneOp();
            } );
    };

photodb.assert_photoId = _assert_photoId;

function _assert_photoId(value)
{
    a.assert_def(value,             'value');
    a.assert_def(value._bsontype,   'value._bsontype');
    a.assert_def(value.id,          'value.id');
};

photodb.newPhotoId = 
    function()
    {
        return mongo.newObjectId();
    };

photodb.addPhoto =
    function(userId, photo, success_f /* (photo) */, error_f /* (e) */)
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(success_f);
        a.assert_f(error_f);

        photo[kCreateDateKey] = new Date();

        _add(userId, photo, success_f, error_f);
    };

photodb.removePhoto =
    function(userId, photo, success_f /* (photo) */, error_f /* (e) */)
    {
        a.assert_uid(userId);
        Photo.assert(photo);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var findOptions = _findOptionsWithPhotoId( photo[kPhotoIdKey] );

        _remove(userId, findOptions, success_f, error_f);
    }

// photodb.addFacebookPhoto =
//     function(userId, docId, fbObject, copyObject, success_f /* (entry) */, error_f )
//     {
//         a.assert_uid(userId);
//         a.assert_def(docId);
//         a.assert_obj(fbObject);
//         a.assert_obj(copyObject);
//         a.assert_f(success_f);
//         a.assert_f(error_f);


//         var type = kPhotoType;
        
//         var newEntry = {};
        
//         newEntry[kPhotoIdKey]        = docId;
//         newEntry[kFacebookIdKey]     = mongo.LongFromString(fbId);

//         newEntry[kPhotoTypeKey]      = type;
//         newEntry[kSourceObjectKey]   = fbObject;
//         newEntry[kCopyObjectKey]     = copyObject;

//         newEntry[kCreateDateKey]     = new Date();

//         _add(userId, newEntry, success_f, error_f);
    
//         return newEntry;
//     };

// photodb.removeFacebookPhoto =
//     function(userId, fbId, success_f, error_f)
//     {
//         a.assert_def(userId);
//         a.assert_fbId(fbId);
//         a.assert_f(success_f);
//         a.assert_f(error_f);
        
//         var findOptions = _findOptionsWithFacebookId(fbId);
        
//         _remove(
//                 userId
//             ,   findOptions 
//             ,   function success(numOfEntries)
//                 {
//                     if (numOfEntries == 1)
//                         success_f();
//                     else
//                         error_f( new Error('numOfEntries expected to be #1 is #' + numOfEntries) );                 
//                 }
//             ,   error_f );
//     };

// photodb.findOneFacebookObject =
//     function(userId, fbId, success_f, error_f)
//     {
//         a.assert_uid(userId);
//         a.assert_fbId(fbId);
//         a.assert_f(success_f);
//         a.assert_f(error_f);

//         var findOptions = _findOptionsWithFacebookId(fbId);

//         _findOne(userId, findOptions, success_f, error_f);    
//     };

// photodb.findAllFacebookObjects =
//     function(userId, success_f, error_f)
//     {
//         a.assert_uid(userId);
//         a.assert_f(success_f);
//         a.assert_f(error_f);

//         _findAll(userId, {}, success_f, error_f);  
//     };


/* ====================================================== */
/* ====================================================== */
/* ======================= PRIVATE ====================== */
/* ====================================================== */
/* ====================================================== */


photodb._getCollection   = _getCollection;
photodb._setupCollection = _setupCollection;
photodb._add        = _add;
photodb._findOne    = _findOne;
photodb._findAll    = _findAll;
photodb._remove     = _remove;
photodb._drop       = _drop;
photodb._findId     = _findId;
photodb._removeId   = _removeId;

function _collectionName(userId)
{
    a.assert_uid(userId);

    return 'user.fb.' + userId + '.photo';
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

function _setupCollection(userId, success_f, error_f)
{    
    _getCollection( 
            userId
        ,   function success(c) {
                var propertyIndex= {};
                propertyIndex[mongo.k.FacebookIdKey] = 1;

                c.ensureIndex( propertyIndex, { unique: true },
                    function(err, indexName)
                    {
                        if (err) {
                            console.error('collection.ensureIndex for mongo.k.FacebookIdKey failed err:' + err);
                            error_f(err);
                        }
                        else
                            success_f(c);
                    } );             
            }
        ,   error_f );
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

function _findOne(userId, findProperties, success_f, error_f)
{
    a.assert_obj(findProperties, 'findProperties');

    _getCollection(
            userId
        ,   function success(c) { mongo.findOne(c, findProperties, success_f, error_f); }
        ,   error_f);
}

function _findAll(userId, findProperties, success_f, error_f)
{
    a.assert_obj(findProperties, 'findProperties');

    _getCollection( 
            userId
        ,   function success(c) { mongo.findAll(c, findProperties, success_f, error_f); }
        ,   error_f);
}

function _remove(userId, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
{
    a.assert_obj(findProperties, 'findProperties');

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

function _findId(userId, photoId, success_f, error_f)
{
    a.assert_uid(userId);
    a.assert_def(photoId, 'photoId');
    a.assert_f(success_f);
    a.assert_f(error_f);

    var findOptions = _findOptionsWithPhotoId(photoId);

    _findOne(userId, findOptions, success_f, error_f);
}

function _removeId(userId, photoId, success_f /* () */, error_f /* (err) */)
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


function _findOptionsWithFacebookId(fbId)
{
    var result = {};
    result[kFacebookIdKey] = mongo.LongFromString(fbId);
    return result;
}


function _findOptionsWithPhotoId( photoIdOrString )
{
    var result = {};

    if ( _.isString(photoIdOrString) )
    {
        result[kPhotoIdKey] = new ObjectID(photoIdOrString);
    }
    else
    {
        _assert_photoId(photoIdOrString);

        result[kPhotoIdKey] = photoIdOrString;
    }

    return result;
}



