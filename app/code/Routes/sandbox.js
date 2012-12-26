
/*
 *      sandbox.js
 */

var url = require('url');

var sandbox = exports;

sandbox.path    = {};
sandbox.route   = {};

var basePath = '/sandbox';

sandbox.path.socketio = basePath + '/s';

sandbox.route.socketio =
    function(req, res)
    {
        res.render('iotest', { title: 'IO latency test' } );
    };


sandbox.path.socketio_ajax = basePath + '/s.ajax/:data?';

sandbox.route.socketio_ajax =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'application/json'});
        
//        var urlElements = url.parse(quest.url, true);
        
        
        var data = JSON.parse(quest.params.data);
        
        console.log(data);
        
        /*
        var dataId = data.id;
        var dataT  = data.timestamp;
                
        var response = {
                id: dataId,
                timestamp: dataT
            };
        */
        
        ponse.end( JSON.stringify( data ) );
    };

