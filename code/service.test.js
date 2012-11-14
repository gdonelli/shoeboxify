
var		assert	= require("assert")
	,	https	= require("https")
	,	http	= require("http")
	,	url		= require("url")
	
	,	fb		= require("./fb")
	,	fbTest	= require("./fb.test")

	,	shoeboxify	= require("./shoeboxify")
	;


describe('Shoeboxify Service',
	function() {

		it( 'Should have pseudoRequest', 
			function() 
			{
				assert(fbTest.pseudoRequest != undefined, 'fbTest.pseudoRequest is undefined');
			} );
	} );
