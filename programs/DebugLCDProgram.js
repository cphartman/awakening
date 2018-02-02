var DebugLCDProgram = function(emulation_core) {
	this.emulation_core = emulation_core;
	this.$window = false;
	this.template = `
	<div class='debug-lcd-window'></div>
	`;

	this.Init = function() {

		this.$window = this.window.$el;
		this.$window.innerHTML = "<div class='debug-lcd-window'></div>";
		this.$window.querySelector(".debug-lcd-window").appendChild(this.emulation_core.canvas);
	}

	this.Refresh = function() {
		if( !this.$window.querySelector("canvas") ) {
			this.$window.innerHTML = "<div class='debug-lcd-window'></div>";
			this.$window.querySelector(".debug-lcd-window").appendChild(this.emulation_core.canvas);
		}
	}
}

