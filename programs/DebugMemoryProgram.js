var DebugMemoryProgram = function(emulation_core) {
	this.row_width = 16;
	this.max = 0x10000;

	this.emulationCore = emulation_core;
	this.view = false;
	this.addressTop = 0;
	this.breakpoints = [];

	this.selectedAddress = -1;
	this.template = `
		<div class="debug-memory-window">
            <div class='memory-row' v-for="row in memory_rows" v-bind:data-address="row.address" >
                <div class='memory-label'>{{row.label}}</div>
                <div class='memory-address'>{{row.address}}</div>
                <div class='memory-values'>
                    <div class='memory-value' v-for="col in row.columns" v-bind:data-address="col.address" v-bind:class="{ selected: col.selected, breakpoint: col.breakpoint }">{{col.value}}</div>
                </div>
            </div>
        </div>
	`;

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
		this.scrollbar = new Scrollbar();
		this.scrollbar.Init(this.$window, row_count);
		this.scrollbar.callback = this.domEvents['scroll'].bind(this);

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
		this.scrollbar.Set(this.addressTop);
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

	this.Refresh = function() {
		var row_height = 20;
		
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / row_height);
		
		var breakpoint_map = {};
		for( var i in this.breakpoints ) {
			var breakpoint = this.breakpoints[i];
			if( breakpoint.r || breakpoint.w ) {
				breakpoint_map[breakpoint.address] = true;
			}
		}

		this.view.memory_rows = [];
		for( var i = 0; i < row_count; i++ ) {

			var address = this.addressTop + i*16;

			this.view.memory_rows[i] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				columns: []
			}

			for( var m = 0; m < 16; m++ ) {
				var column_address = address+m;

				var value = DebugReadMemory(column_address);
				this.view.memory_rows[i].columns[m] = {
					address: int2hex(column_address,4),
					value: int2hex(value,2),
					selected: ( this.selectedAddress == column_address),
					breakpoint: ( breakpoint_map[column_address] ? true : false )
				};
			}
		}
	}

	this.domEvents = {
		'scroll': function() {
			this.addressTop = this.scrollbar.Get() * 16;
			this.Refresh();
		}
	}

	return this;
};
