
var     assert  = require('assert')
    ,   mongodb = require('mongodb')

    ,   a       = use('a')
    ,   mongo   = use('mongo')
    ;


describe('mongo.js',
    function()
    {    
        var testCollection;
        
        mongo.errorLog = false;
        
        it( 'mongo.getCollection',
            function(done) 
            {   
                mongo.getCollection('test',
                    function(err, c)
                    {
                        if (err)
                            throw err;
                            
                        testCollection = c;
                        done();
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
            mongo.add(testCollection, sampleObject,
                function(err, entry)
                {
                    if (err)
                        throw e;
              
                    a.assert_def(entry, 	'addObject expected to return result');
                    a.assert_def(entry._id, 'entry._id is undefined');
                    sampleObjectMongoId = entry._id;

                    done();
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
                mongo.findOne(testCollection, { id : sampleIdLong },
                    function(err, r)
                    {
                        if (err)
                            throw err;
                            
                        assert(r != undefined, 'r is undefined');
                        assert(r.payload != undefined, 'r.payload is undefined');
                        done();
                    });
            } );

        it( 'mongo.findAll',
            function(done) 
            {
                mongo.findAll(testCollection, { id : sampleIdLong },
                    function(err, r)
                    {
                        if (err)
                            throw err;
                          
                        assert(r.length == 2, 'findAll expected to find only #2 result, found #'+ r.length);
                        assert(r[0] != undefined, 'r is undefined');
                        assert(r[0].payload != undefined, 'r.payload is undefined');

                        done();
                    });
            } );

        it( 'mongo.remove {} - expected to fail with no force option',
            function(done) 
            {
                mongo.remove(testCollection, {},
                    function(err, r)
                    {
                        if (err)
                            done();
                        else
                            throw new Error('remove should fail with findOptions {} and no force option');
                    } );
            } );

        it( 'mongo.remove {} force=true',
            function(done) 
            {
                mongo.remove(testCollection, {},
                    function(err, r)
                    {
                        if (err)
                            throw err;
                        else
                            done();
                    }
                ,   {   force: true } );
            } );


        it( 'mongo.drop - success',
            function(done) 
            {
                mongo.drop(testCollection,
                    function success(err, r)
                    {
                        if (err)
                            throw err;

                        assert(r == true, 'r expected to be true');
                        done();
                    } );
            } );

        it( 'mongo.drop - fail',
            function(done) 
            {
                mongo.drop(testCollection,
                   function(err, r)
                    {
                        if (err)
                            done();
                        else
                            throw new Error('not supposed to work');
                    } );
            } );

    } );
