/*

=======================[   Database   ]=======================
Database based on mongo module

API:
            photodb.newObjectId
            photodb.addFacebookPhoto

================================================================

*/

var     assert  = require('assert')
    ,   _       = require('underscore')

    ,   a               = use('a')
    ,   mongo           = use('mongo')
    ,   OperationQueue  = use('OperationQueue')
    ;


var photodb = exports;

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

        if (mongo.db == undefined) { // Main connection to Mongo DB
            q.add(
                function MongoInitOperation(doneOp)
                {
                    mongo.init( function success() { doneOp();      }
                            ,   function error(e)  { q.abort(e);    } );
                } );
        }

        q.add(  // User DB
            function MementoInitOperation(doneOp)
            {
                mongo.memento.init( userId
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


photodb.newObjectId = 
    function()
    {
        return mongo.newObjectId()
    }

photodb.addFacebookPhoto =
    function(userId, docId, fbObject, copyObject, success_f /* (entry) */, error_f )
    {
        a.assert_uid(userId);
        a.assert_def(docId);
        a.assert_obj(fbObject);
        a.assert_obj(copyObject);
        a.assert_f(success_f);
        a.assert_f(error_f);

        var fbId = fbObject.id;
        a.assert_fbId(fbId);

        var type = mongo.k.MementoPhotoType;
        
        var newEntry = {};
        
        newEntry[mongo.k.IdKey]             = docId;
        newEntry[mongo.k.FacebookIdKey]     = mongo.LongFromString(fbId);
        newEntry[mongo.k.FacebookUserIdKey] = mongo.LongFromString(userId);
        
        newEntry[mongo.k.MementoTypeKey]    = type;

        newEntry[mongo.k.SourceObjectKey]   = fbObject;
        newEntry[mongo.k.CopyObjectKey]     = copyObject;

        newEntry[mongo.k.CreateDateKey]     = new Date();

        mongo.memento.add(userId, newEntry, success_f, error_f);
    
        return newEntry;
    }

photodb.removeFacebookPhoto =
    function(userId, fbId, success_f, error_f)
    {
        a.assert_def(userId);
        a.assert_fbId(fbId);
        a.assert_f(success_f);
        a.assert_f(error_f);
        
        var findOptions = mongo.memento.entity.newWithFacebookId(fbId);
        
        mongo.memento.remove(
                userId
            ,   findOptions 
            ,   function success(numOfEntries)
                {
                    if (numOfEntries == 1)
                        success_f();
                    else
                        error_f( new Error('numOfEntries expected to be #1 is #' + numOfEntries) );                 
                }
            ,   error_f);
    };

