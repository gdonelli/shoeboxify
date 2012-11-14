
var		assert		= require("assert")
	,	shoeboxify	= require("./shoeboxify")
	;


describe('Shoeboxify.js Test',
	function() 
	{
		it( 'Enviroment variables test',
			function() {

				shoeboxify.validateEnviroment();

			} );

	} );

