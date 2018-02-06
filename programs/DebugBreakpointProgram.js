var DebugBreakpointProgram = function(emulation_core) {
	this.emulationCore = emulation_core;
	this.rowTop = 0;
	this.$window = false;
	this.view = false;
	this.breakpoints = [];
	this.template = `
		<div class='debug-breakpoint-window'>
            <div class='breakpoint-row header' >
                <div class='breakpoint-address'>ADDR</div>
                <div class='breakpoint-settings'>
                    <span>R</span>
                    <span>W</span>
                    <span>X</span>
                </div>
            </div>
            <div class='breakpoint-row' v-for="row in breakpoint_rows" v-bind:data-address="row.address" v-bind:data-bank="row.bank">
                <div class='breakpoint-address memory-link'><span v-if="row.has_bank" class='address-bank'>{{row.bank}}</span>{{row.address}}</div>
                <div class='breakpoint-settings'>
                    <span><input type="checkbox" data-setting='r' value="1" v-model="row.r"></span>
                    <span><input type="checkbox" data-setting='w' value="1" v-model="row.w"></span>
                    <span><input type="checkbox" data-setting='x' value="1" v-model="row.x"></span>
                </div>
                <div class='breakpoint-remove'>❌</div>
            </div>
        </div>
	`;

	this.Init = function() {

		var $vue_node = this.window.$el;
	
		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	breakpoint_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-breakpoint-window');

		PubSub.publish("Debugger.Breakpoints.Set", this.breakpoints);

		$(this.$window).on("click", ".breakpoint-remove", function(){
			var $parent = $(this).parents(".breakpoint-row");
			var address_hex = $parent.attr('data-address');
			var address = parseInt(address_hex,16);
			PubSub.publish("Debugger.Breakpoint.Remove",address);
		});

		$(this.$window).on("change",".breakpoint-settings input",function(e){
			var $input = $(this);
			var $breakpoint = $input.parents(".breakpoint-row");
			var hex_address = $breakpoint.attr('data-address');
			var address = parseInt(hex_address,16);
			
			var bank = $breakpoint.attr('data-bank');
			var setting = $input.attr('data-setting');
			var value = $input.is(":checked");
			var setting = $input.attr('data-setting');

			var breakpoint_request = {
				address: address,
				settings: {
					bank: bank
				},
			};
			breakpoint_request['settings'][setting] = value;

			PubSub.publish("Debugger.Breakpoint.Update", breakpoint_request);
		});


		PubSub.subscribe("Debugger.Breakpoint.Remove", function(msg,data){
			for( var i = 0; i < this.breakpoints.length; i++) {
				if( this.breakpoints[i].address == data ) {
					this.breakpoints.splice(i,1);
					break;
				}
			}
			this.Refresh();

		}.bind(this));

		PubSub.subscribe("Debugger.Breakpoint.Update", function(msg,data){
			
			var found = false;
			
			for( var i in this.breakpoints ) {
				var breakpoint = this.breakpoints[i];
				if( breakpoint.address == data.address ) {
					// Check for bank matching
					if( breakpoint.address >= 0x4000 && breakpoint.address < 0x8000 && breakpoint.bank != data.settings.bank ) {
						continue;
					}

					found = true;
					for( setting in data.settings ) {
						this.breakpoints[i][setting] = data.settings[setting];
					}
					break;
				}
			}
			
			if( !found ) {
				this.AddBreakpoint(data.address, data.settings);
				PubSub.publish("Debugger.Breakpoints.Set", this.breakpoints);
			}

			this.emulationCore.CompileBreakpoints(this.breakpoints);

			this.Refresh();
			
		}.bind(this));
	}

	this.Refresh = function() {
		this.view.breakpoint_rows = [];
		for( i = 0; i < this.breakpoints.length; i++ ) {
			this.view.breakpoint_rows[i] = {
				r: this.breakpoints[i].r,
				w: this.breakpoints[i].w,
				x: this.breakpoints[i].x,
				address: int2hex(this.breakpoints[i].address,4),
				has_bank: ( this.breakpoints[i].bank > 0 ? this.breakpoints[i].bank : false ),
				bank: this.breakpoints[i].bank
			};
		}
	}

	this.GetBreakpoint = function(address) {
		for( var i in this.breakpoints ) {
			if( this.breakpoints[i].address == address ) {
				return this.breakpoints[i].address;
			}
		}
		return false;
	}

	this.AddBreakpoint = function(address, settings) {
		// Create new breakpoint
		this.breakpoints.push(new DebugBreakpoint(address, settings));
		
		// Announce
		PubSub.publish("Debugger.Breakpoints.Set", this.breakpoints);
	}
}

var DebugBreakpoint = function(address, settings) {
	this.address = address;
	this.bank = ( settings.bank ? settings.bank : false );

	this.x = ( settings.x ? true : false ) ;
	this.r = ( settings.r ? true : false ) ;
	this.w = ( settings.w ? true : false ) ;
}