
Awakening = function(){
	this.emulator = false,
	this.$canvas = false;
	this.debugger = false;
	this.programs = {};

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

		this.programs['lcd'] = DebugProgramFactory.Create("lcd");
		this.programs['memory'] = DebugProgramFactory.Create("memory");
		this.programs['execution'] = DebugProgramFactory.Create("execution");
		this.programs['state'] = DebugProgramFactory.Create("state");
		this.programs['breakpoint'] = DebugProgramFactory.Create("breakpoint");

		// Position windows on Debugger.Refresh
		PubSub.subscribe("Debugger.Refresh", function() {
			this.PositionDebugWindows();
			for( var p in this.programs ) {
				this.programs[p].window.Refresh();
			}
		}.bind(this));

	
		PubSub.publish('Debugger.Refresh');
		PubSub.publish('Debugger.JumpToCurrent');
	}

	this.PositionDebugWindows = function() {

		// I have no idea why this is not correct for my monitor
		// var screen_height = window.innerHeight;

		var screen_height = visualViewport.height;
		var screen_width = window.innerWidth;

		this.programs['lcd'].window.top = 0;
		this.programs['lcd'].window.left = 0;
		this.programs['lcd'].window.width = 160;
		this.programs['lcd'].window.height = 144;
		
		this.programs['memory'].window.top = Math.floor(screen_height/2);
		this.programs['memory'].window.left = 160;
		this.programs['memory'].window.width = 800;
		this.programs['memory'].window.height = Math.floor(screen_height/2);
		
		this.programs['execution'].window.top = 0;
		this.programs['execution'].window.left = 160;
		this.programs['execution'].window.width = 800;
		this.programs['execution'].window.height = Math.floor(screen_height/2);	

		this.programs['state'].window.top = 144;
		this.programs['state'].window.left = 0;
		this.programs['state'].window.width = 160;
		this.programs['state'].window.height = Math.floor(screen_height-160);	
	
		this.programs['breakpoint'].window.top = 0;
		this.programs['breakpoint'].window.left = 960;
		this.programs['breakpoint'].window.width = 200;
		this.programs['breakpoint'].window.height = Math.floor(screen_height/2);
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