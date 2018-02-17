var EmulationSymbols = (function(){
	this.data = {};

	this.symbolList = [];

	this.GetCompiledSymbols = function(rom_name) {
		var symbols = {};
		for(var address in this.data.system ) {
			symbols[address] = Object.assign({}, this.data.system[address]);
		}

		for(var address in this.data[rom_name] ) {
			if( symbols[address] ) {
				symbols[address] = Object.assign(symbols[address], this.data[rom_name][address]);
			} else {
				symbols[address] = Object.assign({}, this.data[rom_name][address]);
			}
		}

		return symbols;
	}

	this.GetAllByNamespace = function(rom_name) {
		var symbols = this.GetCompiledSymbols(rom_name);
		var namespaces = {};
		for( var address in symbols ) {
			var symbol = symbols[address];

			if( symbol.namespace ) {
				if( !namespaces[symbol.namespace] ) {
					namespaces[symbol.namespace] = {};
				}

				namespaces[symbol.namespace][address] = symbol;
			}
		}

		return namespaces;
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