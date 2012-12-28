var socket = io.connect();

// ------------------
// 		test
// ------------------

function testClick()
{
    
    socket.emit('objectForURL', { myid: 'ciao' },
        function(databack) {
            console.log('databack:');
            console.log( databack );
        });
}

// ------------------
// 		Socket.io
// ------------------

function socketioClick()
{
    console.log('Socket.IO');
    
    socket.emit('io-latency', { timestamp: new Date() },
        function(data)
        {
            console.log('data: ');
            console.log(data);
        
            var then = new Date(data.timestamp);
            var now  = new Date();
            var diff = now.getTime() - then.getTime();
            
            console.log('time diff: ' + diff);
            
            $('#sio-timeField').text(' [ ' + diff + 'ms ] ');
        });
}

// ------------------
// 		ajax
// ------------------

function ajaxClick()
{
    console.log('AJAX');

    var data = {
            timestamp: new Date()
        };
    
    $.ajax({
        url: '/sandbox/s.ajax/' + JSON.stringify(data) ,
        success:
            function(data)
            {
                var then = new Date(data.timestamp);
                var now =  new Date();
                var diff = now.getTime() - then.getTime();

                $('#ajax-timeField').text(' [ ' + diff + 'ms ] ');
            }
        });
}


