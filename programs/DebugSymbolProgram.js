var DebugSymbolProgram = function(emulation_core) {
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = `
		<div class='debug-symbol-window'>
		    <div class='symbol-list'>
		    	<div class='namespace-list'>
		    		<select class='namespace'>
		    			<option v-for='namespace in namespaces'>{{namespace}}</option>
		    		</select>
		        <div class='symbol-row' v-for="symbol in symbols" v-bind:data-address="symbol.address">
		            <div class='symbol-address memory-link'>{{symbol.address}}</div>
		            <div class='symbol-name'>{{symbol.label}}</div>
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
		  	namespaces: [],
		  	symbols: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-symbol-window');

		$(this.$window).on("click", ".symbol-row", function(){

			var hex_address = this.getAttribute("data-address");
			var address = parseInt(hex_address,16);

			var selected = this.classList.contains("selected");

			if( !selected ) {
				PubSub.publish("Debugger.Symbol.Select", hex_address);
			}
		});

		$(this.$window).on("click", ".symbol-name", function(){

			var parent = $(this).parents(".symbol-row")[0];
			var hex_address = parent.getAttribute("data-address");
			var address = parseInt(hex_address,16);
			var selected = parent.classList.contains("selected");

			if( selected ) {
				PubSub.publish("Debugger.Symbol.Edit",hex_address);
			}
		});


		PubSub.subscribe("Debugger.Symbol.Edit", function(msg,data){
			var address = data;
			this.popup = new Popup({
				template: "<input type='text'>",
				target: this.$window.querySelector(".symbol-row[data-address='"+address+"'] .symbol-name"),
				address: address,
				changeHandler: function() {
					var address = this.popup.settings.address;
					var value = this.popup.$input.value;
					EmulationSymbols.Update({
						address: parseInt(address,16),
						label: value
					});

					PubSub.publish("Debugger.Refresh");
				}.bind(this)
			});

		}.bind(this));

		PubSub.subscribe("Debugger.Symbol.Select", function(msg,data){
			$(this.$window).find(".selected").removeClass("selected");
			var row = this.$window.querySelector(".symbol-row[data-address='"+data+"'");
			row.classList.add("selected");
		}.bind(this));
	}

	this.Refresh = function() {

		this.view.symbols = [];
		if( typeof RamSymbols != 'undefined' ) {
			for( var i in EmulatorSymbolList ) {
				var symbol = EmulatorSymbolList[i];
				var address = symbol.address;
				var s = {
					group: GameBoyCore.GetMemoryRegion(address),
					label: symbol.label,
					address: int2hex(address,4),
					value: int2hex(DebugReadMemory(address),2)
				};
				this.view.symbols.push(s);
			}

			this.view.namespaces = [];

			for( var i in EmulationSymbols.namespaces ) {
				var namespace = EmulationSymbols.namespaces[i];
				this.view.namespaces.push(namespace);
			}
		}
	}
}