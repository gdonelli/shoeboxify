
//
// serviceAPI.js
//

function ServiceAPI()
{
    this.socket = io.connect();
    this.identifier = 0;
}


ServiceAPI.prototype._createProgressEvent =
    function()
    {
        return 'progress-' + Math.round(Math.random() * 10000) + '-' + this.identifier++;
    }

ServiceAPI.prototype._peformService =
    function(name, data, callback, progress)
    {
        var progressEmitter = new io.EventEmitter();
          
        var progressEvent   = this._createProgressEvent();
        data.progressEvent  = progressEvent;
               
        // Actual RPC
        this.socket.emit(name, data,
            function(ponse)
            {
                this.socket.removeAllListeners(progressEvent);
                
                if (ponse.error)
                    callback(ponse.error);
                else
                    callback(null, ponse);
            });

        this.socket.on(progressEvent,
            function(progressData) {
                progressEmitter.emit('progress', progressData);
            });
        
        return progressEmitter;
    };

ServiceAPI.prototype.getFacebookObjectForURL =
    function(url, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.getFacebookObjectForURL', { url: url }, callback );
    };


ServiceAPI.prototype.shoeboxifyURL =
    function(url, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.shoeboxifyURL', { url: url }, callback );
    };

ServiceAPI.prototype.removePhoto =
    function(photoId, callback /* (err, ponse) */)
    {
        return this._peformService( 'service.removePhoto', { photoId: photoId }, callback );
    };
