
Awakening = function(){
	this.emulator = false,
	this.$canvas = false;
	this.debugger = false;

	this.Init = function() {
		this.$canvas = document.createElement("canvas");

		this.InitEmulator();
		this.LoadSaveState();
		this.InitInput();
		this.InitDebugger();
	},

	this.InitEmulator = function() {
		var rom = atob(la_rom);
		this.emulator = new GameBoyCore(this.$canvas, rom);
		
		// Global reference that should be removed
		gameboy = this.emulator;

		this.emulator.start();

		run();
	}

	this.InitDebugger = function() {

		this.lcd_window = DebuggerWindowFactory.Create("lcd");
		this.mem_window = DebuggerWindowFactory.Create("memory");
		this.execution_window = DebuggerWindowFactory.Create("execution");
		this.state_window = DebuggerWindowFactory.Create("state");

		// Position windows on Debugger.Refresh
		var debugger_refresh = function() {
			this.PositionDebugWindows();
			this.lcd_window.WindowRefresh();
			this.execution_window.WindowRefresh();
			this.mem_window.WindowRefresh();
			this.state_window.WindowRefresh();
		}.bind(this);
		PubSub.subscribe("Debugger.Refresh", debugger_refresh);

	
		PubSub.publish('Debugger.Refresh');
		PubSub.publish('Debugger.JumpToCurrent');
	}

	this.PositionDebugWindows = function() {

		// I have no idea why this is not correct for my monitor
		// var screen_height = window.innerHeight;

		var screen_height = visualViewport.height;
		var screen_width = window.innerWidth;

		this.lcd_window.top = 0;
		this.lcd_window.left = 0;
		this.lcd_window.width = 160;
		this.lcd_window.height = 144;
		
		this.mem_window.top = Math.floor(screen_height/2);
		this.mem_window.left = 160;
		this.mem_window.width = 800;
		this.mem_window.height = Math.floor(screen_height/2);
		
		this.execution_window.top = 0;
		this.execution_window.left = 160;
		this.execution_window.width = 800;
		this.execution_window.height = Math.floor(screen_height/2);	

		this.state_window.top = 144;
		this.state_window.left = 0;
		this.state_window.width = 160;
		this.state_window.height = Math.floor(screen_height-160);	
	
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
/*
		window.setTimeout(function(){
			this.debugger.JumpToCurrent();
		}.bind(this),100);*/
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
var awakening = false;
ready(function(){
	awakening = new Awakening();
	awakening.Init();
});