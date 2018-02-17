var EmulationSymbols = (function(){
	this.data = {};

	this.symbolList = [];

	this.GetAll = function() {
		return this.symbolList;
	}

	this.Init = function() {
		FileLoader.LoadJs(["symbols/system"]);
	};

	this.Load = function(name) {
		FileLoader.LoadJs(["symbols/"+name]);	
	}

	this.Lookup = function(address, rom_name) {

		var working = {}

		if( this.data.system[address] ) {
			working = Object.assign(working, this.data.system[address]);
		}

		if( rom_name && this.data[rom_name] && this.data[rom_name][address] ) {
			working = Object.assign(working, this.data[rom_name][address]);
		}

		if( Object.keys(working).length ) {
			return working;
		} else {
			return false;
		}
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