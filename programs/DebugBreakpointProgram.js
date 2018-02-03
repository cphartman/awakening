var DebugBreakpointProgram = function(emulation_core) {
	this.emulationCore = emulation_core;
	this.rowTop = 0;
	this.$window = false;
	this.view = false;
	this.breakpoints = [];
	this.template = `
		<div class='debug-breakpoint-window'>
            <div class='breakpoint-row header' >
                <div class='execution-address'>ADDR</div>
                <div class='execution-settings'>
                    <span>R</span>
                    <span>W</span>
                    <span>X</span>
                </div>
            </div>
            <div class='breakpoint-row' v-for="row in breakpoint_rows" v-bind:data-address="row.address">
                <div class='execution-address memory-link'>{{row.address}}</div>
                <div class='execution-settings'>
                    <span><input type="checkbox" data-setting='r' value="1" v-model="row.r"></span>
                    <span><input type="checkbox" data-setting='w' value="1" v-model="row.w"></span>
                    <span><input type="checkbox" data-setting='x' value="1" v-model="row.x"></span>
                </div>
                <div class='execution-remove'>❌</div>
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

		$(this.$window).on("change",".execution-settings input",function(e){
			var $input = $(this);
			var $breakpoint = $input.parents(".breakpoint-row");
			var hex_address = $breakpoint.data('address');
			var address = parseInt(hex_address,16);

			var setting = $input.data('setting');
			PubSub.publish("Debugger.Breakpoint.Update", {
				address: address,
				setting: setting,
				value: $input.is(":checked")
			});
		});

		PubSub.subscribe("Debugger.Breakpoint.Update", function(msg,data){
			var found = false;
			for( var i in this.breakpoints ) {
				var breakpoint = this.breakpoints[i];
				if( breakpoint.address == data.address ) {
					this.breakpoints[i][data.setting] = data.value;
					found = true;
					break;
				}
			}

			if( !found ) {
				this.AddBreakpoint(data.address, data.settings);
				PubSub.publish("Debugger.Breakpoints.Set", this.breakpoints);
			}

			this.emulationCore.CompileBreakpoints(this.breakpoints);
		}.bind(this));
	}

	this.Refresh = function() {
		this.view.breakpoint_rows = [];
		for( var i in this.breakpoints ) {
			this.view.breakpoint_rows[i] = {
				r: this.breakpoints[i].r,
				w: this.breakpoints[i].w,
				x: this.breakpoints[i].x,
				address: int2hex(this.breakpoints[i].address,4),
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
		this.breakpoints.push(new DebugBreakpoint(address, settings));
		PubSub.publish("Debugger.Breakpoints.Set", this.breakpoints);
	}
}

var DebugBreakpoint = function(address, settings) {
	this.address = address;

	this.x = ( settings.x ? true : false ) ;
	this.r = ( settings.r ? true : false ) ;
	this.w = ( settings.w ? true : false ) ;
}