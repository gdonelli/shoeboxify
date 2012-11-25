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
			mongo.memento.findOne	- find
			mongo.memento.findAll
			mongo.memento.findId
			mongo.memento.remove	- multi-pourpose remove
			mongo.memento.removeId
			mongo.memento.drop	
Facebook:
			mongo.memento.addFacebookObject
			mongo.memento.findOneFacebookObject
			mongo.memento.findAllFacebookObjects
			mongo.memento.removeFacebookObject 
Entry:
			mongo.entity.getId
			mongo.memento.entity.newWithFacebookId	- entry scafolding
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

var			assert		= require('assert')
		,	mongodb		= require('mongodb')
		,	_			= require('underscore')

		,	handy		= require('./handy')
		,	identity	= require('./identity')
		;


var mongo = exports;

mongo.const = {};

/* ====================================================== */
/* ====================================================== */
/* =======================[  db  ]======================= */
/* ====================================================== */
/* ====================================================== */


mongo.init = 
	function(success_f, error_f)
	{
		_init(	identity.dbServerHost()
			, 	identity.dbServerPort()
			,	identity.dbName()
			,	identity.dbServerUsername()
			,	identity.dbServerPassword()
			,	success_f
			,	error_f
			);
	};


function _init(	host, port, name, username, password, 
				success_f /* (db) */, error_f /* (e) */ )
{
	assert( host != undefined,		'host undefined');
	assert( port != undefined,		'port undefined');
	assert( name != undefined,		'name undefined');
	assert( username != undefined,	'username undefined');
	assert( password != undefined,	'password undefined');

	var server = new mongodb.Server( host, port, {auto_reconnect: true});

	var db = new mongodb.Db( name, server, {safe: true} );

	db.open(
		function (err, db_p)
		{
			if (err) {
				if (error_f)
					error_f(err);

				return;
			}

			db.authenticate(username, password, 
				function (err, result)
				{
					assert(result == true, 'db.authenticate failed');

					// You are now connected and authenticated.

					mongo.db =  db;

					if (success_f)
						success_f(db);

				} );
		} );
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
		assert( mongo.db != undefined,	'mongo.db undefined');
		assert( collectionName != undefined,'collectionName undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

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
		assert( collection != undefined, 'collection is undefined');
		assert( object	   != undefined, 'object is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);
		
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
		assert( collection 		!= undefined, 'collection is undefined');
		assert( findProperties	!= undefined, 'graphId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		collection.findOne(
				findProperties
			,	function(err, item) {
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
		assert( collection != undefined, 'collection is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

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
		assert(collection	!= undefined,	'collection is undefined');
		assert(findProperties != undefined,	'findProperties is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

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
			,	function(err, removeCount) {
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
		assert(collection	!= undefined,	'collection is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);
	
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
	assert( userId != undefined, 'userId is undefined' );
	return 'fb_' + userId + '_memento';
};

mongo.memento.getCollection = 
	function(userId, success_f, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		var collectionName = _memento_collectionName(userId);
	
		mongo.collection.get(collectionName
				,	function success(c) { success_f(c); }
				,	error_f );
	};

mongo.memento.init =
	function(userId, success_f /* (collection) */, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		mongo.memento.getCollection(
				userId
			,	function success(c) {
					var propertyIndex= {};
					propertyIndex[mongo.const.facebookIdKey] = 1;

					c.ensureIndex( propertyIndex, { unique: true },
						function(err, indexName) 
						{
							if (err) {
								console.error('collection.ensureIndex for mongo.const.facebookIdKey failed err:' + err);
								error_f(err);
							}
							else 
								success_f(c);							
						} );				
				}
			,	error_f );
	};

mongo.memento.add =
	function(userId, object, success_f /* (new_entity) */, error_f)
	{
		mongo.memento.getCollection(
				userId
			,	function success(c) { mongo.collection.add(c, object, success_f, error_f); }
			, 	error_f);
	};

mongo.memento.findOne =
	function(userId, findProperties, success_f, error_f)
	{
		mongo.memento.getCollection(
				userId
			,	function success(c) { mongo.collection.findOne(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

mongo.memento.findAll =
	function(userId, findProperties, success_f, error_f)
	{
		mongo.memento.getCollection(
				userId
			,	function success(c) { mongo.collection.findAll(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

mongo.memento.remove =
	function(userId, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
	{
		assert(typeof findProperties == 'object', 'findProperties should be an object. it is ' + typeof findProperties);

		mongo.memento.getCollection(
				userId
			,	function success(c) { mongo.collection.remove(c, findProperties, success_f, error_f, options); }
			, 	error_f);
	};

mongo.memento.drop =
	function(userId, success_f, error_f)
	{
		mongo.memento.getCollection(
				userId
			,	function success(c) { mongo.collection.drop(c, success_f, error_f); }
			, 	error_f);
	};


/* ================================================================== */


mongo.memento.findId =
	function(userId, mongoId, success_f, error_f)
	{
		assert(userId  != undefined, 'userId is undefined');
		assert(mongoId != undefined, 'mongoId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.memento.findOne(userId, mongo.memento.entity.newWithId(mongoId), success_f, error_f);
	}

mongo.memento.removeId =
	function(userId, mongoId, success_f /* () */, error_f /* (err) */)
	{
		assert(mongoId != undefined, 'mongoId is undefined');
		handy.assert_f(success_f);

		mongo.memento.remove(userId
				,	mongo.memento.entity.newWithId(mongoId)
				,	function(num)
					{
						assert(num == 1, 'num of removed entries is #' + num + 'expected #1');
						success_f();
					} 
				,	error_f );	
	};


/* ================================================================== */
/* ================================================================== */
/* ===================[   User Facebook Methods  ]=================== */
/* ================================================================== */
/* ================================================================== */

// Keys
mongo.const.facebookIdKey		= 'fb_id';
mongo.const.facebookUserIdKey	= 'fb_userid';
mongo.const.sourceObjectKey		= 'source';
mongo.const.copyObjectKey		= 'copy';
mongo.const.createDateKey		= 'created';

mongo.const.mementoTypeKey		= 'type';

mongo.const.mementoPhotoType	= 1;


mongo.memento.addFacebookObject =
	function(userId, graphId, sourceObject, copyObject, success_f /* (newDBEntry) */, error_f)
	{
		assert(userId != undefined,		'userId is undefined');
		assert(graphId != undefined,	'graphId is undefined');
		assert(sourceObject != undefined, 'sourceObject is undefined');
		assert(copyObject != undefined,	'copyObject is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		var type = 0; // only photo type supported at this point

		if (sourceObject.picture != undefined &&
			sourceObject.source != undefined &&
			sourceObject.images != undefined)
			type = mongo.const.mementoPhotoType;

		assert(type == mongo.const.mementoPhotoType, 'Unsupported facebook object type');

		var entity = {};
		
		entity[mongo.const.mementoTypeKey]		= type;
		entity[mongo.const.facebookIdKey]		= mongo.LongFromString(graphId);
		entity[mongo.const.facebookUserIdKey]	= mongo.LongFromString(userId);
		entity[mongo.const.sourceObjectKey]		= sourceObject;
		entity[mongo.const.copyObjectKey]		= copyObject;
		entity[mongo.const.createDateKey]		= new Date();

		mongo.memento.add(userId, entity, success_f, error_f);
	};

mongo.memento.findOneFacebookObject =
	function(userId, fbId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		assert(  fbId != undefined,	'fbId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.memento.findOne(userId, mongo.memento.entity.newWithFacebookId(fbId), success_f, error_f);	
	};

mongo.memento.findAllFacebookObjects =
	function(userId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.memento.findAll(userId, {}, success_f, error_f);	
	};

mongo.memento.removeFacebookObject =
	function(userId, graphId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

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

mongo.const.entityId = '_id'; // default mongo id

mongo.entity = {};

mongo.entity.getId =
	function(entity)
	{
		assert(entity != undefined,	'entity is undefined');

		return entity[mongo.const.entityId];
	}

mongo.memento.entity = {};

mongo.memento.entity.newWithFacebookId = 
	function (graphId)
	{
		var result = {};
		result[mongo.const.facebookIdKey] = mongo.LongFromString(graphId);
		return result;		
	}

mongo.memento.entity.newWithId = 
	function(theId)
	{
		var result = {};
		result[mongo.const.entityId] = theId;
		return result;		
	}

mongo.memento.entity.getType =
	function(entry)
	{
		return _getEntryProperty(entry, mongo.const.mementoTypeKey);
	}

mongo.memento.entity.getFacebookId =
	function(entry)
	{
		return _getLongProperty(entry, mongo.const.facebookIdKey);
	}

mongo.memento.entity.getFacebookUserId =
	function(entry)
	{
		return _getLongProperty(entry, mongo.const.facebookUserIdKey);
	}

mongo.memento.entity.getSourceObject =
	function(entry)
	{
		return _getEntryProperty(entry, mongo.const.sourceObjectKey);
	}

mongo.memento.entity.getCopyObject =
	function(entry)
	{
		return _getEntryProperty(entry, mongo.const.copyObjectKey);
	}

function _getEntryProperty(entry, property)
{
	assert(entry != undefined,	'entry is undefined');
	var value = entry[property];
	assert(value != undefined, property + ' for the entry is undefined');

	return value;
}

function _getLongProperty(entry, property)
{
	assert(entry != undefined,	'entry is undefined');
	var value = entry[property];
	assert(value != undefined, property + ' for the entry is undefined');

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

