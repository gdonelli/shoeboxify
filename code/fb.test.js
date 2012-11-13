
var		assert	= require("assert")
	,	https	= require("https")
	,	http	= require("http")
	,	url		= require("url")
	
	,	fb		= require("./fb")
	,	utils	= require("./utils")

	,	shoeboxify	= require("./shoeboxify")
	;


describe('Facebook authentication ->',
	function() {

		it( 'should login',
			function(done) 
			{
				utils.GET('http://local.shoeboxify.com:3000/facebook-login'
					,	function _200OK(string, ponse) {
							console.log('200 OK:');
							console.log(string);

							console.log( 'ponse.headers : ');
							console.log( ponse.headers );

							// console.log('ponse:');
							// console.log(ponse);

							// throw new Error('/facebook-login shouldnt return 200_OK');
						}					
					,	function other(ponse) {
							console.log('ponse.statusCode: ' + ponse.statusCode);
							assert(ponse.statusCode == 302, 'facebook-login should return 302 response');


							// console.log( 'ponse: ');
							// console.log( ponse );

							// console.log( 'ponse.readBuffer: ');
							// console.log( ponse.readBuffer );

							
							console.log( 'ponse.headers : ');
							console.log( ponse.headers );

							assert(ponse.headers.location != undefined, 'ponse.headers.location is undefined');

							utils.GET(ponse.headers.location
								,	function _200OK(string, ponse) {
										console.log('200 OK:');
										console.log(string);

										console.log('ponse.headers :');
										console.log( ponse.headers );
									}					
								,	function other(ponse) {
										console.log('ponse.statusCode: ' + ponse.statusCode);
										// assert(ponse.statusCode == 302, 'facebook-login should return 302 response');


										 // console.log( 'ponse: ');
										 // console.log( ponse );

										// console.log( 'ponse.readBuffer: ');
										// console.log( ponse.readBuffer );

										console.log( 'ponse.headers.location: ');
										console.log( ponse.headers.location );


								

									}
								,	function error(e) {
										throw new Error('/facebook-login failed');
									}
								);

						}
					,	function error(e) {
							throw new Error('/facebook-login failed');
						}
					// ,	true
					
					);


			} );
	} );
