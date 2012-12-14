/*

==========================[   Mongo   ]==========================

Shoeboxify layer to interface with the mongo database.
Built on top of the mongodb native driver:
http://mongodb.github.com/node-mongodb-native

Setup:  
            mongo.init
Collection:
            mongo.getCollection
            mongo.add
            mongo.findOne
            mongo.findAll
            mongo.remove
            mongo.drop
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
        
        /* aux ==== */

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
    };


/* ================================================================== */
/* ================================================================== */
/* ===================[   Collection Foundation   ]================== */
/* ================================================================== */
/* ================================================================== */


mongo.getCollection =
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


mongo.add = 
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


mongo.findOne =
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


mongo.findAll =
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


mongo.remove =
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


mongo.drop =
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

