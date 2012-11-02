
//
// ui.js 
//
// Shoeboxify UI lib
//


var _ui = (function () 
{
	var consoleDefined = false;

	// constructor
	var ui = function(){
	if (window.console)
		consoleDefined = true;
	};

	// prototype
	ui.prototype = {
		constructor: ui

		,	  log: log
	/*	,	debug: debug */
		,	error: error	
	};


	function log(string)
	{
		if (window.console)
			console.log(string);
	}
	
	function error(string)
	{
		if (window.console)
			console.error('**** ' + string);
	}

	// return ui
	return ui;
})();

var ui =  new _ui();

