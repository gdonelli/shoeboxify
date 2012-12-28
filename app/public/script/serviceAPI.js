
//
// serviceAPI.js
//

function ServiceAPI()
{
    this.socket = io.connect();
}


ServiceAPI.prototype._peformService =
    function(name, data, callback)
    {
        this.socket.emit(name, data,
            function(ponse)
            {
                if (ponse.error)
                    callback(ponse.error);
                else
                    callback(null, ponse);
            });
    };

ServiceAPI.prototype.getFacebookObjectForURL =
    function(url, callback /* (err, ponse) */)
    {
        this._peformService( 'service.getFacebookObjectForURL', { url: url }, callback );
    };


ServiceAPI.prototype.shoeboxifyURL =
    function(url, callback /* (err, ponse) */)
    {
        this._peformService( 'service.shoeboxifyURL', { url: url }, callback );
    };
