/*

==========================[   Mongo   ]==========================

Shoeboxify layer to interface with the mongo database.
Built on top of the mongodb native driver:
http://mongodb.github.com/node-mongodb-native

Deals with collections and basic database operations

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

mongo.errorLog = true; // error logging

function _initModule(callback /* (err) */)
{
    a.assert_f(callback);

    var host = identity.dbServerHost();
    var port = identity.dbServerPort();
    var name = identity.dbName();
    var username = identity.dbServerUsername();
    var password = identity.dbServerPassword();

    var server = new mongodb.Server( host, port, { auto_reconnect:true } );

    var db = new mongodb.Db( name, server, { safe:true } );

    db.open(
        function (err, db_p)
        {
            if (err)
                return callback(err);

            db.authenticate(username, password, 
                function (err, result)
                {
                    if (err)
                        return callback(err);
                    else
                    {
                        mongo._db =  db;
                        callback(null);
                    }
               });
        });
};



/* ================================================================== */
/* ================================================================== */
/* ===================[   Collection Foundation   ]================== */
/* ================================================================== */
/* ================================================================== */


mongo.getCollection =
    function(collectionName, callback /* (err, collection) */ )
    {
        a.assert_string(collectionName, 'collectionName');
        a.assert_f(callback, 'callback');
        
        var q = new OperationQueue(1);
        
        q.on('abort', callback);
        
        // Lazy init if needed
        if (mongo._db == undefined)
        {
            q.add(
                function InitOperation(doneOp) {
                    _initModule(
                        function(err) {
                            if (err)
                                return q.abort(new Error('mongo.init failed'));
                            else
                                doneOp();
                        });
                });
        }
        
        q.add(
            function GetCollectionOperation(doneOp)
            {
                mongo._db.collection( collectionName, callback );
            });
    };


mongo.add = 
    function(collection, object, callback /* (err, entryObject) */ )
    {
        a.assert_def(collection, 'collection');
        a.assert_obj(object,     'object');
        a.assert_f(callback,   'callback');
        
        var objectToAdd = _.clone(object); // make a copy because it will change the source object...

        collection.insert( objectToAdd, { safe:true },
            function(err, result)
            {
                if (err)
                    return callback(err);
                    
                assert(result.length == 1, 'insert expected to return array of length #1, is instead: #' + result.length);

                callback(null, result[0]);                   
            });
    };


mongo.findOne =
    function(collection, findProperties, callback  /* (err, item) */)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback,   		'callback');

        collection.findOne(findProperties,
            function(err, item) {
                if (err && mongo.errorLog) {
                    console.error('collection.findOne() failed:');
                    console.error(err.stack);
                }
                
                callback(err, item);
            } );
    };


mongo.findAll =
    function(collection, findProperties, callback /* (err, item) */)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback,   		'callback');

        collection.find(findProperties).toArray(
            function(err, item) {
                if (err && mongo.errorLog){
                    console.error('collection.find().toArray failed:');
                    console.error(err.stack);
                }
                
                callback(err, item);
            } );
    };


mongo.remove =
    function(collection, findProperties, callback /* (err, num_of_removed_entries) */, options)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback,   		'callback');

        // console.log( 'findProperties.length: ' + Object.keys(findProperties).length );

        if ( Object.keys(findProperties).length == 0) 
        {
            var force = false;

            if (options)
                force = options.force;

            if (force != true) {
                callback( new Error('Denied. it will remove all entries. Use force option') );
                return;
            }
        }

        collection.remove(findProperties
            ,   function(err, removeCount) {
                    if (err && mongo.errorLog) {
                        console.error('collection.remove failed:');
                        console.error(err.stack);
                    }

                    callback(err, removeCount);
                } );
    };


mongo.drop =
    function(collection, callback /* (err, removed) */)
    {
        a.assert_def(collection, 'collection');
        a.assert_f(callback);
    
        collection.drop(
            function(err, removed)
            {
                if (err && mongo.errorLog) {
                    console.error('collection.drop failed:');
                    console.error(err.stack);
                }

                callback(err, removed)
            } );
    };

/* ====================================================== */
/* ====================================================== */
/* =====================[  utils  ]====================== */
/* ====================================================== */
/* ====================================================== */

mongo.newObjectId =
    function(value)
    {
        return new ObjectID();
    }


mongo.LongFromString =
    function(string)
    {
        return mongodb.Long.fromString(string);
    };

