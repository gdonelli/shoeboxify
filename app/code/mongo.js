
var			assert		= require('assert')
		,	mongodb		= require('mongodb')
		,	_			= require('underscore')
		,	handy		= require('./handy')
		,	shoeboxify	= require('./shoeboxify')
		;


/* ====================================================== */
/* ====================================================== */
/* =======================  init  ======================= */
/* ====================================================== */
/* ====================================================== */


exports.init = 
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

					exports.db =  db;

					if (success_f)
						success_f(db);

				} );
		} );
}


function _userCollectionName(userId)
{
	assert( userId != undefined, 'userId is undefined' );

	return 'FB' + userId;
}


function _getUserCollection(userId, success_f /* (collection) */,  error_f /* (e) */ )
{
	assert( exports.db != undefined, 'mongo.db undefined');

	exports.db.collection(
		_userCollectionName(userId),
		function(err, collection)
		{
			if (err) {
				console.error('collection.ensureIndex(owner_id, graph_id) failed err:' + err);

				if (error_f)
					error_f(err);
			}
			else
			{
				collection.ensureIndex( { graph_id:1, user_id:1 }, { unique: true }, 
					function(err, indexName)
					{
						if (err)
						{
							console.error('collection.ensureIndex(owner_id, graph_id) failed err:' + err);
							if (error_f)
								error_f(err);
						}
						else 
						{
							if (success_f)
								success_f(collection);							
						}
					} );

			}
		} );
}


function _addToUser(userId, object, success_f, error_f)
{
	assert( userId != undefined, 'userId is undefined');
	assert( object != undefined, 'object is undefined');

	_getUserCollection(userId
		,	function success(collection)
			{
				_addToCollection(collection, object, success_f, error_f);
			}
		,	function error(e)
			{
				if (error_f)
					error_f(e);
			} );
};

/* ====================================================== */
/* ====================================================== */
/* ======================= utils  ======================= */
/* ====================================================== */
/* ====================================================== */

exports.LongFromString =
	function(string)
	{
		return mongodb.Long.fromString(string);
	}

/*{
	graph_id:_LongFromString(graphId), 
}*/
// { user_id: _LongFromString(userIdstr) }


/* ======================================================================= */
/* ======================================================================= */
/* ======================= collection manipulation ======================= */
/* ======================================================================= */
/* ======================================================================= */


exports.collection = {};


exports.collection.get =
	function(collectionName, success_f, error_f)
	{
		assert( exports.db != undefined,	'mongo.db undefined');
		assert( collectionName != undefined,'collectionName undefined');
		handy.assert_f(success_f);
		handy.assert_f(error_f);

		exports.db.collection(	
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


exports.collection.init = 
	function(collectionName, success_f, error_f)
	{
		exports.collection.get(
				collectionName
			,	function success(c) {
					c.ensureIndex( { graph_id:1 }, { unique: true },
						function(err, indexName) 
						{
							if (err) {
								console.error('collection.ensureIndex for graph_id failed err:' + err);
								error_f(err);
							}
							else 
								success_f(c);							
						} );				
				}
			,	error_f
			);
	};


exports.collection.add = 
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


exports.collection.findOne =
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


exports.collection.findAll =
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


exports.collection.remove =
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


exports.collection.drop =
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


/* ======================================================== */
/* ======================================================== */
/* =======================   user   ======================= */
/* ======================================================== */
/* ======================================================== */


exports.user = {};	

exports.user.collectionName =
	function(userId)
	{
		assert( userId != undefined, 'userId is undefined' );
		return 'FB' + userId;
	};

exports.user.getCollection = 
	function(userId, success_f, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		var collectionName = exports.user.collectionName(userId);
	
		exports.collection.get(collectionName
				,	function success(c) { success_f(c); }
				,	error_f );
	};

exports.user.init =
	function(userId, success_f, error_f)
	{
		assert( userId!=undefined, 'userId is undefined');
		assert( userId.length > 0, 'userId.length <= 0');
		
		var collectionName = exports.user.collectionName(userId);

		exports.collection.init(collectionName, success_f, error_f );
	}

exports.user.add =
	function(userId, object, success_f /* (new_entry) */, error_f)
	{
		exports.user.getCollection(
				userId
			,	function success(c) { exports.collection.add(c, object, success_f, error_f); }
			, 	error_f);
	};

exports.user.findOne =
	function(userId, findProperties, success_f, error_f)
	{
		exports.user.getCollection(
				userId
			,	function success(c) { exports.collection.findOne(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

exports.user.findAll =
	function(userId, findProperties, success_f, error_f)
	{
		exports.user.getCollection(
				userId
			,	function success(c) { exports.collection.findAll(c, findProperties, success_f, error_f); }
			, 	error_f);
	};

exports.user.remove =
	function(userId, findProperties, success_f, error_f, options)
	{
		exports.user.getCollection(
				userId
			,	function success(c) { exports.collection.remove(c, findProperties, success_f, error_f, options); }
			, 	error_f);
	};

exports.user.drop =
	function(userId, success_f, error_f)
	{
		exports.user.getCollection(
				userId
			,	function success(c) { exports.collection.drop(c, success_f, error_f); }
			, 	error_f);
	};



// ============================================================================
// old


exports.user.findByGraphID = 
	function(userId, graphId, success_f, error_f)
	{
		assert( userId != undefined, 'userId is undefined');
		assert( graphId != undefined, 'graphId is undefined');

		_getUserCollection(userId
			,	function success(collection)
				{
					_findByGraphIdInCollection(collection, graphId, success_f, error_f);

					_addToCollection(collection, object, success_f, error_f);
				}
			,	function error(e)
				{
					if (error_f)
						error_f(e);
				} );

	}


function _findAllByUser(userId, success_f, error_f)
{
	assert( userId != undefined, 'userId is undefined');

	_getUserCollection(userId
		,	function success(collection)
			{
				_findAllInCollection(collection, success_f, error_f);
			}
		,	function error(e)
			{
				if (error_f)
					error_f(e);
			} );
}

/* 
 * Collection:	object
 *
 *	   Schema:	{
 *					graph_id,
 *					user_id,
 *					source,
 *					copy,
 *					created,
 *				}
 */

exports.object = {};

exports.object.add =
	function(graphId, userIdstr, sourceObject, copyObject, success_f, error_f)
	{
		var doc = {};

		doc.graph_id = exports.LongFromString(graphId);
		doc.user_id	 = exports.LongFromString(userIdstr);
		doc.source	 = sourceObject;
		doc.copy	 = copyObject;
		doc.created	 = new Date();

		shoeboxify.debug('ADDTO objects: ('  + graphId + ', ' + userIdstr + ')');

		return _addToCollection(exports.collection.object, doc, success_f, error_f); 
	};

exports.object.find =
	function( graphid, userId, success_f, error_f) 
	{
		_findByGraphID

		assert( exports.collection != undefined, 'collection is undefined, mongodb not initialized?');
		assert( exports.collection.object != undefined, 'collection.object is undefined');

		return _findOne(exports.collection.object, graphId, userIdstr, success_f, error_f);
	};

exports.object.allByUser =
	function( userId, success_f, error_f) 
	{
		_findAllByUser(userId, success_f, error_f);
	};

