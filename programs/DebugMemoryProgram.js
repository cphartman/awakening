var DebugMemoryProgram = function(emulation_core) {
	this.row_width = 16;
	this.max = 0x10000;

	this.emulationCore = emulation_core;
	this.view = false;
	this.addressTop = 0;
	this.breakpoints = [];
	this.selectedMemBank = "ROM0";
	this.selectedRomBank = 1;

	this.selectedAddress = -1;
	this.template = `
		<div class="debug-memory-window">
			<div class='memory-row-toolbar'>
				<label>Region:</label>
				<button class='memory-region selected' data-region='ROM0'>ROM [00]</button>
				<button class='memory-region' data-region='VRAM'>VRAM</button>
				<button class='memory-region' data-region='SRAM'>SRAM</button>
				<button class='memory-region' data-region='WRAM'>WRAM</button>
				<button class='memory-region' data-region='OAM'>OAM</button>
				<button class='memory-region' data-region='I/O'>I/O</button>
				<button class='memory-region' data-region='HRAM'>HRAM</button>
			</div>
			<div class='memory-row-header'>
				<span>00</span><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span>
				<span>08</span><span>09</span><span>0A</span><span>0B</span><span>0C</span><span>0D</span><span>0E</span><span>0F</span>
			</div>

			<div class='memory-rows'>
	            <div class='memory-row' v-for="row in memory_rows" v-bind:data-address="row.address">
	            	<div class='symbol-row' v-if="row.symbols.length">
	            		<span class='symbol memory-link' v-for="symbol in row.symbols" v-bind:data-address="symbol.address" v-bind:style="{left: symbol.left}">
							{{symbol.hex}}	
	            		</span>
					</div>
	                <div class='memory-address'>{{row.address_hex}}</div>
	                <div class='memory-values'>
	                    <div class='memory-value' v-for="col in row.values" v-bind:data-address="col.address" foo-class="{ selected: col.selected, breakpoint: col.breakpoint }">{{col.value_hex}}</div>
	                </div>
	            </div>
	        </div>
        </div>
	`;

	this.Refresh = function() {
		this.CompileRows();
	}

	this.CompileRows = function() {

		var rows = [];
		
		if( this.selectedMemBank != "ROM1" ) {

			// Get values
			var mem_values = [];
			var bank_start = 0;
			var bank_end = 0;;
			
			for( var i = 0; i < GameBoyCore.MemoryRegions.length; i++ ) {
				if( GameBoyCore.MemoryRegions[i].label == this.selectedMemBank ) {
					bank_start = GameBoyCore.MemoryRegions[i].start;
					bank_end = GameBoyCore.MemoryRegions[i].end;					
				}
			}

			for( var index = 0; index < bank_end-bank_start; index++) {

				col = index % 16;
				row = Math.floor(index/16);

				if( col == 0 ) {
					var row_address = bank_start+(row*16);
					rows[row] = {
						symbols: [],
						values: [],
						address: row_address,
						address_hex: int2hex(row_address,4)
					};
				}

				var address = bank_start + index;
				var value = DebugReadMemory(address); 
				var symbol = EmulationSymbols.Lookup(address);
				if( symbol ) {
					var s = {
						label: symbol.label,
						address: address,
						left: (col*10)+"px",
						hex: int2hex(address,4)
					}

					rows[row].symbols.push(s);
				}
				rows[row].values[col] = {
					value: value,
					value_hex: int2hex(value,2),
					address: address,
					selected: false,
					breakpoint: false
				}
			}

			this.view.memory_rows = rows;
		}
	}

	this.Init = function() {

		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: this.window.$el,
		  data: {
		  	memory_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-memory-window');

		var row_count = this.emulationCore.memory.length / 16;
		//this.scrollbar = new Scrollbar();
		//this.scrollbar.Init(this.$window, row_count);
		//this.scrollbar.callback = this.domEvents['scroll'].bind(this);

		this.Refresh();

		PubSub.subscribe("Debugger.Memory.JumpTo",function (msg, data) {
			this.JumpTo(data);
			this.Refresh();
		}.bind(this));


		PubSub.subscribe("Debugger.Memory.Select",function (msg, data) {
			this.selectedAddress = data;
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Breakpoints.Set",function (msg, data) {
			this.breakpoints = data;
			this.Refresh();
		}.bind(this));

		this.SetupMemoryLinkEvent();

		$(this.window.$el).on("click", ".memory-region", function(event){
			this.window.$el.querySelector(".memory-region.selected").classList.remove("selected");
			event.target.classList.add("selected");

			var dataRegion = event.target.getAttribute("data-region");
			this.selectedMemBank = dataRegion;
			this.Refresh();
		}.bind(this));

		$(this.window.$el).on("click", ".memory-value", function(event){
			
			var selected = $(this).hasClass('selected');

			if( selected ) {
				this.popup = new Popup({
					template: "<input>",
					target: this,
					address: this.getAttribute("data-address"),
					changeHandler: function() {
						var address_hex = this.popup.settings.address;
						var address = parseInt(address_hex, 16);
						var value_hex = this.popup.$input.value;
						var value_int = parseInt(value_hex, 16);

						// Clamp value
						value_int = (value_int > 0xff ? 0xff : value_int);
						value_int = (value_int < 0 ? 0 : value_int);
						
						DebugWriteMemory(address, value_int);
						PubSub.publish('Debugger.Refresh');
					}.bind(this)
				})
			} else {
				var hex_address_str = this.getAttribute("data-address");
				var address = parseInt(hex_address_str,16);

				PubSub.publish("Debugger.Memory.Select", address);
			}
		});

		$(this.window.$el).on("contextmenu", ".memory-value", function(event){
			var hex_address_str = this.getAttribute("data-address");
			var address = parseInt(hex_address_str,16);

			PubSub.publish("Debugger.Memory.Select", address);

			this.popup = new Popup({
				template: `
					<ul>
						<li data-click='breakpoint'>Add Breakpoint</li>
						<li data-click='symbol'>Add Symbol</li>
						<li data-click='value'>Edit Value</li>
					</ul>
				`,
				address: address,
				clickHandler: function(label){
					switch(label) {
						case 'breakpoint':
							PubSub.publish("Debugger.Breakpoint.Update",{address:this.popup.settings.address, settings:{r:true,w:true}});
							PubSub.publish('Debugger.Refresh');
							break;
						case 'symbol':
							EmulationSymbols.Update({
								address: this.popup.settings.address,
								label: "Symbol",
								type: "Memory",
								namespace: ""
							});
							PubSub.publish("Debugger.Refresh");
							window.setTimeout(function(){
								//PubSub.publish("Debugger.Symbol.Edit",this.popup.settings.address);
							}.bind(this),1);
							break;
					}
							
				}.bind(this)
			});

			return false;
		});

	}

	this.JumpTo = function(address) {
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / 20);
		
		this.addressTop = (address & 0xFFF0) - Math.floor(row_count/2) * 0x0010;
		if( this.addressTop < 0 ) {
			this.addressTop = 0;
		}

		this.selectedAddress = address;
		//this.scrollbar.Set(this.addressTop/16);
		this.Refresh();
			
	}

	this.SetupMemoryLinkEvent = function() {
		document.body.addEventListener("click", function(e){
			
			var $iterator = e.target;
			while( $iterator ) {
				if( $iterator.classList.contains("memory-link") ) {
					break;
				}
				$iterator = $iterator.parentElement;
			}

			if( $iterator ) {
				var string = $iterator.innerText.toLowerCase().replace(/[^0-9a-f]/i,"");
				var address = parseInt(string,16);
				PubSub.publish("Debugger.Memory.JumpTo", address);
			}

		});
	}

	this.domEvents = {
		'scroll': function() {
			//this.addressTop = this.scrollbar.Get() * 16;
			// this.Refresh();
		}
	}

	return this;
};
