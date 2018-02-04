var EmulationSymbols = (function(){
	
	this.symbolList = [];

	this.Init = function() {
		FileLoader.LoadJs(["emulation/symbols/RamSymbols"], function(){
			this.symbolList = EmulatorSymbolList;

		}.bind(this));
	};

	this.Lookup = function(address) {
		for( var i = 0; i < this.symbolList.length; i++ ) {
			lhsSymbol = this.symbolList[i];
			if( lhsSymbol.address == address ) {
				return lhsSymbol;
			}
		}

		return false;
	}

	this.Update = function(rhsSymbol) {
		var found = false;
		for( var i = 0; i < this.symbolList.length; i++ ) {
			lhsSymbol = this.symbolList[i];
			if( lhsSymbol.address == rhsSymbol.address ) {
				for( var k in rhsSymbol ) {
					lhsSymbol[k] = rhsSymbol[k];
				}
				found = true;
				break;
			}
		}

		if( !found ) {
			this.symbolList.push(rhsSymbol);
		}
	}

	return this;

})();
EmulationSymbols.Init();