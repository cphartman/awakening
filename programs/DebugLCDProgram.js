var DebugLCDProgram = function(emulation_core) {
	this.emulation_core = emulation_core;
	this.$window = false;
	this.template = `
	<div class='debug-lcd-window'></div>
	`;

	this.Init = function() {

		this.$window = this.window.$el;
		this.$window.innerHTML = this.template;
		this.$lcdWindow = this.$window.querySelector(".debug-lcd-window");
		this.$lcdWindow.appendChild(this.emulation_core.canvas);

		PubSub.subscribe("Debugger.Execution.Pause", function(){
			this.$lcdWindow.classList.add("paused");
		}.bind(this));

		PubSub.subscribe("Debugger.Execution.Play", function(){
			this.$lcdWindow.classList.remove("paused");
		}.bind(this));
	}

	this.Refresh = function() {
		if( !this.$window.querySelector("canvas") ) {
			this.$window.innerHTML = "<div class='debug-lcd-window'></div>";
			this.$window.querySelector(".debug-lcd-window").appendChild(this.emulation_core.canvas);
		}
	}
}

