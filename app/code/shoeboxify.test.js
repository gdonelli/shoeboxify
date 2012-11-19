
var		assert		= require("assert")
	,	shoeboxify	= require("./shoeboxify")
	;


describe('shoeboxify.js',
	function() 
	{
		it( 'Enviroment variables test',
			function() {

				shoeboxify.validateEnviroment();

			} );

	} );

