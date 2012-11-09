
var			mongodb		= require('mongodb')
		,	assert		= require('assert')
		,	shoeboxify	= require('./shoeboxify');


exports.init = 
	function(host, port, name, username, password) {
		var server = new mongodb.Server( host, port, {auto_reconnect: true});

		var db = new mongodb.Db( name, server, {safe: true} );

		db.open(
			function (err, db_p)
			{
				if (err) {
					throw err;
				}

				db.authenticate(username, password, 
					function (err, result)
					{
						assert(result == true, 'db.authenticate failed');

						// You are now connected and authenticated.

						exports.db =  db;
						exports.collection = {};

						db.collection('object',
							function(err, collection) {
								exports.collection.object = collection;

								collection.ensureIndex( { graph_id:1, user_id:1 }, { unique: true }, 
									function(err, indexName)
									{
										if (err)
											console.error('collection.object.ensureIndex(owner_id, graph_id) failed err:'+err);
									} );
	
							} );



						// InitObjectCollection(db);
					} );
			} );
	};

/*
function InitObjectCollection(db)
{
	 db.createCollection('object', {safe:true},
	 	function(err, collection) {
	 		console.log('createCollection -err:');
	 		console.log(err);

	 		console.log('createCollection -collection:');
	 		console.log(collection);
	 	} );
}
*/

function _LongFromString(string)
{
	return mongodb.Long.fromString(string);
}

function _add(collection, object, successF, errorF)
{
	 collection.insert( object, { safe:true },
	 	function(err, result)
	 	{
	 		if (err)
	 		{
	 			console.log('collection.insert err: ' + err);

	 			if (errorF)
	 				errorF(err);
	 		}
	 		else
	 		{
	 			if (successF)
	 				successF(result);
	 		}

	 	});
};

function _findOne(collection, graphIDstr, userIDstr, successF, errorF)
{
	collection.findOne( {
							graph_id:_LongFromString(graphIDstr), 
							user_id: _LongFromString(userIDstr) 
						},
						function(err, item) {
							if (err)
							{
								if (errorF)
									errorF(err);
							}						
							else
							{
								if (successF)
									successF(item);
							}
						} );
}

function _findAllbyUser(collection, userIDstr, successF, errorF)
{
	collection.find( { user_id: _LongFromString(userIDstr) } ).toArray(
						function(err, item) {
							if (err)
							{
								if (errorF)
									errorF(err);
							}						
							else
							{
								if (successF)
									successF(item);
							}
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
	function(graphIDstr, userIDstr, sourceObject, copyObject, successF, errorF)
	{
		var doc = {};

		doc.graph_id = _LongFromString(graphIDstr);
		doc.user_id	 = _LongFromString(userIDstr);
		doc.source	 = sourceObject;
		doc.copy	 = copyObject;
		doc.created	 = new Date();

		return _add(exports.collection.object, doc, successF, errorF); 
	};

exports.object.find =
	function( graphIDstr, userIDstr, successF, errorF) 
	{
		return _findOne(exports.collection.object, graphIDstr, userIDstr, successF, errorF);
	};

exports.object.allByUser =
	function( userIDstr, successF, errorF) 
	{
		return _findAllbyUser(exports.collection.object, userIDstr, successF, errorF);
	};

