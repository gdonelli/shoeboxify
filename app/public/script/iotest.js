var socket = io.connect();


// ------------------
// 		Socket.io
// ------------------

function socketioClick()
{
    console.log('Socket.IO');
    
    var data = {
            timestamp: new Date()
        };
    
    socket.emit('iotest', data);
}

socket.on('back', function (data)
{
    var then = new Date(data.timestamp);
    var now  = new Date();
    var diff = now.getTime() - then.getTime();
    
    console.log('time diff: ' + diff);
    
    $('#sio-timeField').text(' [ ' + diff + 'ms ] ');
});

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
