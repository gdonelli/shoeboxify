
var mongo = exports;

var			assert		= require('assert')
		,	mongodb		= require('mongodb')
		,	_			= require('underscore')
		,	handy		= require('./handy')
		,	shoeboxify	= require('./shoeboxify')
		;


/* ====================================================== */
/* ====================================================== */
/* =======================[  db  ]======================= */
/* ====================================================== */
/* ====================================================== */


mongo.init = 
	function(success_f, error_f)
	{
		_init(	shoeboxify.dbServerHost()
			, 	shoeboxify.dbServerPort()
			,	shoeboxify.dbName()
			,	shoeboxify.dbServerUsername()
			,	shoeboxify.dbServerPassword()
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


/*{
	graph_id:_LongFromString(graphId), 
}*/
// { user_id: _LongFromString(userIdstr) }



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
	 				success_f(result);
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


mongo.user = {};	

mongo.user.collectionName =
	function(userId)
	{
		assert( userId != undefined, 'userId is undefined' );
		return 'FB' + userId;
	};

mongo.user.getCollection = 
	function(userId, success_f, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		var collectionName = mongo.user.collectionName(userId);
	
		mongo.collection.get(collectionName
				,	function success(c) { success_f(c); }
				,	error_f );
	};

mongo.user.init =
	function(userId, success_f /* (collection) */, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		mongo.user.getCollection(
				userId
			,	function success(c) {
					var propertyIndex= {};
					propertyIndex[mongo.const.facebookId] = 1;

					c.ensureIndex( propertyIndex, { unique: true },
						function(err, indexName) 
						{
							if (err) {
								console.error('collection.ensureIndex for mongo.const.facebookId failed err:' + err);
								error_f(err);
							}
							else 
								success_f(c);							
						} );				
				}
			,	error_f );
	};

mongo.user.add =
	function(userId, object, success_f /* (new_entry) */, error_f)
	{
		mongo.user.getCollection(
				userId
			,	function success(c) { mongo.collection.add(c, object, success_f, error_f); }
			, 	error_f);
	};

mongo.user.findOne =
	function(userId, findProperties, success_f, error_f)
	{
		mongo.user.getCollection(
				userId
			,	function success(c) { mongo.collection.findOne(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

mongo.user.findAll =
	function(userId, findProperties, success_f, error_f)
	{
		mongo.user.getCollection(
				userId
			,	function success(c) { mongo.collection.findAll(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

mongo.user.remove =
	function(userId, findProperties, success_f /* (num_of_removed_entries) */, error_f, options)
	{
		mongo.user.getCollection(
				userId
			,	function success(c) { mongo.collection.remove(c, findProperties, success_f, error_f, options); }
			, 	error_f);
	};

mongo.user.drop =
	function(userId, success_f, error_f)
	{
		mongo.user.getCollection(
				userId
			,	function success(c) { mongo.collection.drop(c, success_f, error_f); }
			, 	error_f);
	};



/* ================================================================== */
/* ================================================================== */
/* ===================[   User Facebook Methods  ]=================== */
/* ================================================================== */
/* ================================================================== */

// Keys
mongo.const = {};
mongo.const.facebookId	= 'fb_id';
mongo.const.facebookUserId		= 'fb_userid';
mongo.const.sourceObject		= 'source';
mongo.const.copyObject			= 'copy';
mongo.const.createDate			= 'created';


mongo.user.addFacebookObject =
	function(userId, graphId, sourceObject, copyObject, success_f /* (newDBEntry) */, error_f)
	{
		assert(userId != undefined,		'userId is undefined');
		assert(graphId != undefined,	'graphId is undefined');
		assert(sourceObject != undefined, 'sourceObject is undefined');
		assert(copyObject != undefined,	'copyObject is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		var entry = {};
		entry[mongo.const.facebookId]		= mongo.LongFromString(graphId);
		entry[mongo.const.facebookUserId]	= mongo.LongFromString(userId);
		entry[mongo.const.sourceObject]		= sourceObject;
		entry[mongo.const.copyObject]		= copyObject;
		entry[mongo.const.createDate]		= new Date();

		mongo.user.add(userId, entry, success_f, error_f);
	};

mongo.user.findOneFacebookObject =
	function(userId, graphId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.user.findOne(userId, mongo.entry.newWithFacebookId(graphId), success_f, error_f);	
	};

mongo.user.findAllFacebookObjects =
	function(userId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.user.findAll(userId, {}, success_f, error_f);	
	};

mongo.user.removeFacebookObject =
	function(userId, graphId, success_f, error_f)
	{
		assert(userId != undefined,	'userId is undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		mongo.user.remove(userId, mongo.entry.newWithFacebookId(graphId), 
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


mongo.entry = {};

mongo.entry.newWithFacebookId = 
	function (graphId)
	{
		var result = {};
		result[mongo.const.facebookId] = mongo.LongFromString(graphId);
		return result;		
	}


function _getLongProperty(entry, property)
{
	assert(entry != undefined,	'entry is undefined');
	var value = entry[property];
	assert(value != undefined, property + ' for the entry is undefined');

	return value.toString();
}

mongo.entry.getFacebookId =
	function(entry)
	{
		return _getLongProperty(entry, mongo.const.facebookId);
	}


mongo.entry.getFacebookUserId =
	function(entry)
	{
		return _getLongProperty(entry, mongo.const.facebookUserId);
	}

mongo.entry.getSourceObject =
	function(entry)
	{
		assert(entry != undefined,	'entry is undefined');

		return entry[mongo.const.sourceObject] ;
	}

mongo.entry.getCopyObject =
	function(entry)
	{
		assert(entry != undefined,	'entry is undefined');

		return entry[mongo.const.copyObject] ;
	}
