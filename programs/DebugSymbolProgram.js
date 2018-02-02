var DebugSymbolProgram = function(emulation_core) {
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = `
		<div class='debug-symbol-window'>
		    <div class='symbol-list'>
		        <div class='symbol-row' v-for="symbol in symbols">
		            <div class='symbol-group'>{{symbol.group}}</div>
		            <div class='symbol-address memory-link'>{{symbol.address}}</div>
		            <div class='symbol-name'>{{symbol.name}}</div>
		            <div class='symbol-value'>{{symbol.value}}</div>
		        </div>
		    </div>
		</div>
	`;

	this.Init = function() {
		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	symbols: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-symbol-window');
	}

	this.Refresh = function() {

		this.view.symbols = [];
		if( typeof RamSymbols != 'undefined' ) {
			for( var a in RamSymbols ) {
				var address = parseInt(a,10);
				var symbol = {
					group: GameBoyCore.GetMemoryRegion(address),
					name: RamSymbols[a],
					address: int2hex(address,4),
					value: int2hex(DebugReadMemory(address),2)
				};
				this.view.symbols.push(symbol);
			}
		}
	}
}