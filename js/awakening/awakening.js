
Awakening = function(){
	this.emulator = false,
	this.$canvas = false;
	this.debugger = false;

	this.Init = function() {
		this.$canvas = document.querySelector("#mainCanvas");

		this.InitEmulator();
		this.LoadSaveState();
		this.InitInput();
		//DebugInit(this.emulator);
	},

	this.InitEmulator = function() {
		var rom = atob(la_rom);
		this.emulator = new GameBoyCore(this.$canvas, rom);
		
		// Global reference that should be removed
		gameboy = this.emulator;

		this.emulator.start();

		// Create debugging hooks
		this.debugger = new Debugger(this.emulator);
		var $state_window = document.querySelector(".debug-state-window");
		this.debugger.InitStateWindow($state_window);

		var $execution_window = document.querySelector(".debug-execution-window");
		this.debugger.InitExecutionWindow($execution_window);

		run();
	}

	this.IsReady = function() {

		if( !la_rom ) {
			return false;
		}

		if( !la_savestate ) {
			return false;
		}

		if( document.readyState !== 'complete') {
			return false;
		}

		return true;
	},

	this.InitInput = function() {
		document.addEventListener("keydown", keyDown);
		document.addEventListener("keyup", function (event) {
			keyUp(event);
		});
	}

	this.LoadSaveState = function() {
		this.emulator.returnFromState(la_savestate);

		window.setTimeout(function(){
			this.debugger.JumpToCurrent();
		}.bind(this),100);
	}
}

// Bootstrap
var awakening = false;
function ready(fn) {
  if (document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}
ready(function(){
	awakening = new Awakening();
	awakening.Init();
});