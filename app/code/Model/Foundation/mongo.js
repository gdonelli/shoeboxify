/*

==========================[   Mongo   ]==========================

Shoeboxify layer to interface with the mongo database.
Built on top of the mongodb native driver:
http://mongodb.github.com/node-mongodb-native

Setup:  
            mongo.init
Collection:
            mongo.collection.get
            mongo.collection.add
            mongo.collection.findOne
            mongo.collection.findAll
            mongo.collection.remove
            mongo.collection.drop
Memento:
            mongo.memento.init
            mongo.memento.getCollection
            mongo.memento.add
            mongo.memento.findOne   - find
            mongo.memento.findAll
            mongo.memento.findId
            mongo.memento.remove    - multi-pourpose remove
            mongo.memento.removeId
            mongo.memento.drop  
Facebook:
            mongo.memento.addFacebookObject
            mongo.memento.findOneFacebookObject
            mongo.memento.findAllFacebookObjects
            mongo.memento.removeFacebookObject 
Entry:
            mongo.newObjectId
            mongo.entity.getId
            mongo.memento.entity.newWithFacebookId  - entry scafolding
            mongo.memento.entity.newWithId
            mongo.memento.entity.getType
            mongo.memento.entity.getFacebookId
            mongo.memento.entity.getFacebookUserId
            mongo.memento.entity.getSourceObject
            mongo.memento.entity.getCopyObject
Utils:
            mongo.LongFromString

=================================================================

*/

var         assert      = require('assert')
        ,   mongodb     = require('mongodb')
        ,   ObjectID    = require('mongodb').ObjectID
        ,   _           = require('underscore')

        ,   a           = use('a')
        ,   identity    = use('identity')
        
        ,   OperationQueue  = use('OperationQueue')
        ;


var mongo = exports;

mongo.k = {};

/* ====================================================== */
/* ====================================================== */
/* =======================[  db  ]======================= */
/* ====================================================== */
/* ====================================================== */


mongo.init = 
    function(success_f, error_f)
    {
        _init(  identity.dbServerHost()
            ,   identity.dbServerPort()
            ,   identity.dbName()
            ,   identity.dbServerUsername()
            ,   identity.dbServerPassword()
            ,   success_f
            ,   error_f
            );
    };


function _init( host, port, name, username, password, 
                success_f /* (db) */, error_f /* (e) */ )
{
    a.assert_def(host, 'host');
    a.assert_def(port, 'port');
    a.assert_def(name, 'name');
    a.assert_def(username, 'username');
    a.assert_def(password, 'password');
    a.assert_f(success_f);
    a.assert_f(error_f);

    var server = new mongodb.Server( host, port, {auto_reconnect: true});

    var db = new mongodb.Db( name, server, {safe: true} );

    db.open(
        function (err, db_p)
        {
            if (err)
                return error_f(err);

            db.authenticate(username, password, 
                function (err, result)
                {
                    assert(result == true, 'db.authenticate failed');

                    // You are now connected and authenticated.

                    mongo.db =  db;

                    success_f(db);
                } );
        } );
}

mongo.initWithMiddlewareOperation =
    function(operation, success_f, error_f)
    {

    }

/* ================================================================== */
/* ================================================================== */
/* ===================[   Collection Foundation   ]================== */
/* ================================================================== */
/* ================================================================== */


mongo.collection = {};


mongo.collection.get =
    function(collectionName, success_f, error_f)
    {
        a.assert_def(mongo.db,          'mongo.db');
        a.assert_def(collectionName,    'collectionName');
        a.assert_f(success_f);
        a.assert_f(error_f);

        mongo.db.collection(    
            collectionName,
            function(err, collection)
            {
                if (err) {
                    console.error('db.collection failed err:' + err);
                    error_f(err);
                }
                else
                {
                    success_f(collection);
                }
            } );
    };


mongo.collection.add = 
    function(collection, object, success_f /* (result) */, error_f)
    {
        a.assert_def(collection,    'collection');
        a.assert_obj(object,        'object');
        a.assert_f(success_f);
        a.assert_f(error_f);
        
        var objectToAdd = _.clone(object); // make a copy because it will change the source object...

        collection.insert( objectToAdd, { safe:true },
            function(err, result)
            {
                if (err)
                {
                    // console.error('collection.insert err: ' + err);
                    error_f(err);
                }
                else
                {
                    assert(result.length == 1, 'insert expected to return array of length #1, is instead: #' + result.length);

                    success_f(result[0]);
                }
                    
            });
    };


mongo.collection.findOne =
    function(collection, findProperties, success_f, error_f)
    {
        a.assert_def(collection, 'collection');
        a.assert_obj(findProperties, 'findProperties');
        a.assert_f(success_f);
        a.assert_f(error_f);

        collection.findOne(
                findProperties
            ,   function(err, item) {
                    if (err)
                    {
                        console.error('collection.findOne failed ' + err );
                        error_f(err);
                    }                       
                    else
                    {
                        success_f(item);
                    }
                } );
    };


mongo.collection.findAll =
    function(collection, findProperties, success_f, error_f)
    {
        a.assert_def(collection, 'collection');
        a.assert_f(success_f);
        a.assert_f(error_f);

        collection.find(findProperties).toArray(
            function(err, item) {
                if (err) {
                    console.error('collection.find().toArray failed ' + err );
                    error_f(err);
                }
                else
                    success_f(item);
            } );
    };


mongo.collection.remove =
    function(collection, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
    {
        a.assert_def(collection, 'collection');
        a.assert_obj(findProperties, 'findProperties');
        a.assert_f(success_f);
        a.assert_f(error_f);

        // console.log( 'findProperties.length: ' + Object.keys(findProperties).length );

        if ( Object.keys(findProperties).length == 0) 
        {
            var force = false;

            if (options)
                force = options.force;

            if (force != true) {
                error_f( new Error('Denied. it will remove all entries. Use force option') );
                return;
            }
        }

        collection.remove(findProperties
            ,   function(err, removeCount) {
                    if (err) {
                        console.error('collection.remove failed ' + err);
                        error_f(err);
                    }
                    else
                        success_f(removeCount);
                } );
    };


mongo.collection.drop =
    function(collection, success_f /* () */, error_f)
    {
        a.assert_def(collection, 'collection');
        a.assert_f(success_f);
        a.assert_f(error_f);
    
        collection.drop(
            function(err, removed) {
                if (err) {
                    // console.error('collection.drop failed ' + err);
                    error_f(err);
                }
                else
                    success_f(removed);
            } );        
    };


/* ================================================================== */
/* ================================================================== */
/* ======================[   User Foundation   ]===================== */
/* ================================================================== */
/* ================================================================== */


mongo.memento = {}; 

function _memento_collectionName(userId)
{
    a.assert_uid(userId);

    return 'fb_' + userId + '_memento';
};

mongo.memento.getCollection = 
    function(userId, success_f, error_f)
    {
        a.assert_uid(userId);
       
        var collectionName = _memento_collectionName(userId);
    
        mongo.collection.get(collectionName
                ,   function success(c) { success_f(c); }
                ,   error_f );
    };

mongo.memento.init =
    function(userId, success_f /* (collection) */, error_f)
    {
        a.assert_uid(userId);
        
        mongo.memento.getCollection(
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
    };

mongo.memento.add =
    function(userId, object, success_f /* (new_entity) */, error_f)
    {
        mongo.memento.getCollection(
                userId
            ,   function success(c) { mongo.collection.add(c, object, success_f, error_f); }
            ,   error_f);
    };

mongo.memento.findOne =
    function(userId, findProperties, success_f, error_f)
    {
        mongo.memento.getCollection(
                userId
            ,   function success(c) { mongo.collection.findOne(c, findProperties, success_f, error_f); }
            ,   error_f);
    };

mongo.memento.findAll =
    function(userId, findProperties, success_f, error_f)
    {
        mongo.memento.getCollection(
                userId
            ,   function success(c) { mongo.collection.findAll(c, findProperties, success_f, error_f); }
            ,   error_f);
    };

mongo.memento.remove =
    function(userId, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
    {
        a.assert_obj(findProperties, 'findProperties');

        mongo.memento.getCollection(
                userId
            ,   function success(c) { mongo.collection.remove(c, findProperties, success_f, error_f, options); }
            ,   error_f);
    };

mongo.memento.drop =
    function(userId, success_f, error_f)
    {
        mongo.memento.getCollection(
                userId
            ,   function success(c) { mongo.collection.drop(c, success_f, error_f); }
            ,   error_f);
    };


/* ================================================================== */


mongo.memento.findId =
    function(userId, mongoId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_def(mongoId, 'mongoId');
        a.assert_f(success_f);
        a.assert_f(error_f);

        var id;

        if ( _.isString(mongoId) )
            id = new ObjectID(mongoId);
        else
            id = mongoId;

        mongo.memento.findOne(userId, mongo.memento.entity.newWithId(id), success_f, error_f);
    }

mongo.memento.removeId =
    function(userId, mongoId, success_f /* () */, error_f /* (err) */)
    {
        a.assert_def(mongoId, 'mongoId');
        a.assert_f(success_f);

        mongo.memento.remove(userId
                ,   mongo.memento.entity.newWithId(mongoId)
                ,   function(num)
                    {
                        assert(num == 1, 'num of removed entries is #' + num + 'expected #1');
                        success_f();
                    } 
                ,   error_f );  
    };


/* ================================================================== */
/* ================================================================== */
/* ===================[   User Facebook Methods  ]=================== */
/* ================================================================== */
/* ================================================================== */

// Konstants

mongo.k.FacebookIdKey       = 'fb_id';
mongo.k.FacebookUserIdKey   = 'fb_userid';
mongo.k.SourceObjectKey     = 'source';
mongo.k.CopyObjectKey       = 'copy';
mongo.k.CreateDateKey       = 'created';

mongo.k.MementoTypeKey      = 'type';

mongo.k.MementoPhotoType    = 1;


mongo.memento.addFacebookObject =
    function(userId, graphId, sourceObject, copyObject, success_f /* (newDBEntry) */, error_f)
    {
        a.assert_uid(userId);
        assert(graphId != undefined, 'graphId is undefined');
        a.assert_obj(sourceObject);
        a.assert_obj(copyObject);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var type = 0; // only photo type supported at this point

        if (sourceObject.picture != undefined &&
            sourceObject.source != undefined &&
            sourceObject.images != undefined)
            type = mongo.k.MementoPhotoType;

        assert(type == mongo.k.MementoPhotoType, 'Unsupported facebook object type');

        var entity = {};
        
        entity[mongo.k.MementoTypeKey]      = type;
        entity[mongo.k.FacebookIdKey]       = mongo.LongFromString(graphId);
        entity[mongo.k.FacebookUserIdKey]   = mongo.LongFromString(userId);
        entity[mongo.k.SourceObjectKey]     = sourceObject;
        entity[mongo.k.CopyObjectKey]       = copyObject;
        entity[mongo.k.CreateDateKey]       = new Date();

        mongo.memento.add(userId, entity, success_f, error_f);
    };

mongo.memento.findOneFacebookObject =
    function(userId, fbId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_fbId(fbId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        mongo.memento.findOne(userId, mongo.memento.entity.newWithFacebookId(fbId), success_f, error_f);    
    };

mongo.memento.findAllFacebookObjects =
    function(userId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        mongo.memento.findAll(userId, {}, success_f, error_f);  
    };

mongo.memento.removeFacebookObject =
    function(userId, graphId, success_f, error_f)
    {
        a.assert_uid(userId);
        a.assert_f(success_f);
        a.assert_f(error_f);

        mongo.memento.remove(userId, mongo.memento.entity.newWithFacebookId(graphId), 
            function success(numOfEntries)
            {
                assert(numOfEntries == 1, 'numOfEntries expected to be #1 is #' + numOfEntries);
                success_f();
            }, 
            error_f);   
    };


/* ========================================================== */
/* ========================================================== */
/* ===================[  Entry Methods  ]=================== */
/* ========================================================== */
/* ========================================================== */

mongo.newObjectId =
    function()
    {
        return new ObjectID();
    }

mongo.k.IdKey = '_id'; // default mongo id

mongo.entity = {};

mongo.entity.getId =
    function(entity)
    {
        assert(entity != undefined, 'entity is undefined');

        return entity[mongo.k.IdKey];
    }

mongo.memento.entity = {};

mongo.memento.entity.newWithFacebookId = 
    function (graphId)
    {
        var result = {};
        result[mongo.k.FacebookIdKey] = mongo.LongFromString(graphId);
        return result;      
    }

mongo.memento.entity.newWithId = 
    function(theId)
    {
        var result = {};
        result[mongo.k.IdKey] = theId;
        return result;      
    }

mongo.memento.entity.getType =
    function(entry)
    {
        return _getEntryProperty(entry, mongo.k.MementoTypeKey);
    }

mongo.memento.entity.getFacebookId =
    function(entry)
    {
        return _getLongProperty(entry, mongo.k.FacebookIdKey);
    }

mongo.memento.entity.getFacebookUserId =
    function(entry)
    {
        return _getLongProperty(entry, mongo.k.FacebookUserIdKey);
    }

mongo.memento.entity.getSourceObject =
    function(entry)
    {
        return _getEntryProperty(entry, mongo.k.SourceObjectKey);
    }

mongo.memento.entity.getCopyObject =
    function(entry)
    {
        return _getEntryProperty(entry, mongo.k.CopyObjectKey);
    }

function _getEntryProperty(entry, property)
{
    assert(entry != undefined,  'entry is undefined');
    var value = entry[property];
    assert(value != undefined, property + ' for the entry is undefined');

    return value;
}

function _getLongProperty(entry, property)
{
    var value = _getEntryProperty(entry, property);

    return value.toString();
}


/* ====================================================== */
/* ====================================================== */
/* =====================[  utils  ]====================== */
/* ====================================================== */
/* ====================================================== */

mongo.LongFromString =
    function(string)
    {
        return mongodb.Long.fromString(string);
    };

