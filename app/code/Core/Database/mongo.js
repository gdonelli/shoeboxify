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

function _initModule(callback_f /* (err) */)
{
    a.assert_f(callback_f);

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
                return callback_f(err);

            db.authenticate(username, password, 
                function (err, result)
                {
                    if (err)
                        return callback_f(err);
                    else
                    {
                        mongo._db =  db;
                        callback_f(null);
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
    function(collectionName, callback_f /* (err, collection) */ )
    {
        a.assert_string(collectionName, 'collectionName');
        a.assert_f(callback_f, 'callback_f');
        
        var q = new OperationQueue(1);
        
        q.on('abort', callback_f);
        
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
                mongo._db.collection( collectionName, callback_f );
            });
    };


mongo.add = 
    function(collection, object, callback_f /* (err, entryObject) */ )
    {
        a.assert_def(collection, 'collection');
        a.assert_obj(object,     'object');
        a.assert_f(callback_f,   'callback_f');
        
        var objectToAdd = _.clone(object); // make a copy because it will change the source object...

        collection.insert( objectToAdd, { safe:true },
            function(err, result)
            {
                if (err)
                    return callback_f(err);
                    
                assert(result.length == 1, 'insert expected to return array of length #1, is instead: #' + result.length);

                callback_f(null, result[0]);                   
            });
    };


mongo.findOne =
    function(collection, findProperties, callback_f  /* (err, item) */)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback_f,   		'callback_f');

        collection.findOne(findProperties,
            function(err, item) {
                if (err && mongo.errorLog) {
                    console.error('collection.findOne() failed:');
                    console.error(err.stack);
                }
                
                callback_f(err, item);
            } );
    };


mongo.findAll =
    function(collection, findProperties, callback_f /* (err, item) */)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback_f,   		'callback_f');

        collection.find(findProperties).toArray(
            function(err, item) {
                if (err && mongo.errorLog){
                    console.error('collection.find().toArray failed:');
                    console.error(err.stack);
                }
                
                callback_f(err, item);
            } );
    };


mongo.remove =
    function(collection, findProperties, callback_f /* (err, num_of_removed_entries) */, options)
    {
        a.assert_def(collection,		'collection');
        a.assert_obj(findProperties,	'findProperties');
        a.assert_f(callback_f,   		'callback_f');

        // console.log( 'findProperties.length: ' + Object.keys(findProperties).length );

        if ( Object.keys(findProperties).length == 0) 
        {
            var force = false;

            if (options)
                force = options.force;

            if (force != true) {
                callback_f( new Error('Denied. it will remove all entries. Use force option') );
                return;
            }
        }

        collection.remove(findProperties
            ,   function(err, removeCount) {
                    if (err && mongo.errorLog) {
                        console.error('collection.remove failed:');
                        console.error(err.stack);
                    }

                    callback_f(err, removeCount);
                } );
    };


mongo.drop =
    function(collection, callback_f /* (err, removed) */)
    {
        a.assert_def(collection, 'collection');
        a.assert_f(callback_f);
    
        collection.drop(
            function(err, removed)
            {
                if (err && mongo.errorLog) {
                    console.error('collection.drop failed:');
                    console.error(err.stack);
                }

                callback_f(err, removed)
            } );
    };

/* ====================================================== */
/* ====================================================== */
/* =====================[  utils  ]====================== */
/* ====================================================== */
/* ====================================================== */

mongo.newObjectId =
    function()
    {
        return new ObjectID();
    }

mongo.LongFromString =
    function(string)
    {
        return mongodb.Long.fromString(string);
    };

