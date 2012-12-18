
var     assert  = require('assert')
    ,   mongodb = require('mongodb')
    ,   mongo   = use('mongo')
    ;


describe('mongo.js',
    function()
    {    
        var testCollection;

        it( 'mongo.getCollection',
            function(done) 
            {   
                mongo.getCollection('test' 
                    ,   function success(c)
                        {
                            testCollection = c;
                            done();
                        }
                    ,   function error(e)
                        {
                            throw new Error('mongo.getCollection failed ' + e);
                        } );
            } );

        var sampleId = Math.random() * 100000;
        var sampleIdLong = mongo.LongFromString( '1' + sampleId + '1' );
        var sampleObject = { 
                    id: sampleIdLong
                ,    payload: 'Nel cammino di nostra vita mi ritrovai in una selva oscura'
                };

        var sampleObjectMongoId;

        function _addSampleObject(done)
        {
            mongo.add(testCollection, sampleObject
                    ,   function success(entry)
                        {
                            assert(entry != undefined, 'addObject expected to return result');
                            assert(entry._id != undefined, 'entry._id is undefined');
                            sampleObjectMongoId = entry._id;

                            done();
                        }
                    ,   function error(e)
                        {
                            throw e;
                        } );
        }

        it( 'mongo.add',
            function(done) 
            {
                _addSampleObject(done);
            } );


        it( 'mongo.add - same object',
            function(done) 
            {   
                _addSampleObject(done);
            } );


        it( 'mongo.findOne',
            function(done) 
            {
                mongo.findOne(testCollection, { id : sampleIdLong }
                    ,   function success(r)
                        {
                            assert(r != undefined, 'r is undefined');
                            assert(r.payload != undefined, 'r.payload is undefined');
                            done();
                        }
                    ,   function error(e)
                        {
                            throw e;
                        } );
            } );

        it( 'mongo.findAll',
            function(done) 
            {
                mongo.findAll(testCollection, { id : sampleIdLong }
                    ,   function success(r)
                        {   
                            assert( r.length == 2, 'findAll expected to find only #2 result, found #'+ r.length);                   
                            assert(r[0] != undefined, 'r is undefined');
                            assert(r[0].payload != undefined, 'r.payload is undefined');

                            done();
                        }
                    ,   function error(e)
                        {
                            throw e;
                        } );
            } );

        it( 'mongo.remove {} - expected to fail with no force option',
            function(done) 
            {
                mongo.remove(testCollection, {}
                    ,   function success(r)
                        {   
                            throw new Error('remove should fail with findOptions {} and no force option');
                        }
                    ,   function error(e)
                        {
                            done();
                    } );
            } );

        it( 'mongo.remove {} force=true',
            function(done) 
            {
                mongo.remove(testCollection, {}
                    ,   function success(r) 
                        {   
                            done();
                        }
                    ,   function error(e)
                        {
                            throw e;
                        }
                    ,   {   force: true } );
            } );


        it( 'mongo.drop - success',
            function(done) 
            {
                mongo.drop(testCollection
                    ,   function success(r) 
                        {   
                            assert(r == true, 'r expected to be true');
                            done();
                        }
                    ,   function error(e)
                        {
                            throw e;
                        } );
            } );

        it( 'mongo.drop - fail',
            function(done) 
            {
                mongo.drop(testCollection
                    ,   function success(r) 
                        {   
                            throw e;
                        }
                    ,   function error(e)
                        {
                            done();                     
                        } );
            } );

    } );
