
/*
 *      view.js
 */

var     https   = require('https')
    ,   url     = require('url')
    ,   path    = require('path')

    ,   mongo   = use('mongo')
    ,   memento = use('memento')
    ,   common  = use('common')
    ,   User    = use('User')
    ;

var view = exports;


view.route  = {}; 
view.path   = {}; 


view.path.shoeboxified = '/view/shoeboxified';

view.route.shoeboxified =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');
        ponse.write('<script> function view(id) { window.open("' +view.path.shoeboxified + '/"+id, "_blank"); } </script>');

        ponse.write('<body>');
        ponse.write('<h1>' + 'Shoeboxified' + '</h1><div>');

        var user = User.fromRequest(quest);

        mongo.memento.findAllFacebookObjects( 
                user.getFacebookId()
            ,   function success(r)
                {
                    for (var i in r)
                    {
                        var object_i = r[i];
                        
                        var sourcePict  = object_i.source.picture;
                        var copyPict    = object_i.copy.picture;

                        var oId = mongo.entity.getId(object_i);

                        ponse.write('<img src="' + copyPict + '" ');

                        ponse.write('onclick="view(\'' + oId + '\')" ');

                        ponse.write('></img>\n');
                    }

                    ponse.end('</div></body></html>');

                }
            ,   function error(e){
                    console.log('find returned error:');
                    console.log(e);
                });     

    };



view.path.shoeboxified_id = '/view/shoeboxified/:oid?';

view.route.shoeboxified_id =
    function(quest, ponse)
    {
        ponse.writeHead(200, {'Content-Type': 'text/html'});

        ponse.write('<html>');

        ponse.write('<body>');

        ponse.write('<h1>' + quest.params.oid + '</h1>');

        memento.findId(
                fb.me(quest, 'id')
            ,   quest.params.oid
            ,   function success(entry) {
                    console.log(entry);
                    ponse.write( common.objectToHTML(entry, quest.params.oid) );
                    _theEnd();
                }
            ,   function error(e) {
                    ponse.write( common.objectToHTML(e, quest.params.oid) );
                    _theEnd();
                } );

        function _theEnd()
        {
            ponse.write('</body>');
            ponse.end('</html>');           
        }
    };

