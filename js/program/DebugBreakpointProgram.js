var DebugBreakpointProgram = function(emulation_core) {
	this.emulationCore = emulation_core;
	this.rowTop = 0;
	this.$window = false;
	this.view = false;

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

		this.AddBreakpoint();
	}

	this.Refresh = function() {
	}

	this.AddBreakpoint = function(type, address, parameters) {
		this.view.breakpoint_rows.push({
			label: 'RAM1',
			type: 'memory',
			value: 'AF F0',
			address: 0x0000,
			break_on_read: true,
			break_on_write: false,
		})
	}
}