
/*
 * GET home page.
 */

var index = exports;

index.path	= {};
index.route	= {};

index.path.index = '/';

index.route.index = 
	function(req, res)
	{
	  res.render('index', { title: 'Shoeboxify App (Development Site)' });
	};
