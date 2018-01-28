var EmulationSymbols = (function(){
	
	this.Init = function() {
		FileLoader.LoadJs(["emulation/symbols/RamSymbols"]);
	};

	this.Lookup = function(address) {
		if( typeof RamSymbols !== 'undefined' ) {
			return RamSymbols[address];
		} else {
			return false;
		}

	}

	return this;

})();
EmulationSymbols.Init();