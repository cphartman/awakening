var DebugLCDProgram = function(emulation_core) {
	this.emulation_core = emulation_core;
	this.$window = false;

	this.Init = function() {
		var $window = this.window.$el;
		this.$window = $window;
		this.$window.innerHTML = "<div class='debug-lcd-window'></div>";
		this.$window.querySelector(".debug-lcd-window").appendChild(this.emulation_core.canvas);
	}

	this.Refresh = function() {
	}
}

