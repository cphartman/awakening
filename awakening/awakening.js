
Awakening = function(){
	this.emulator = false,
	this.$canvas = false;
	this.debugger = false;
	this.programs = {};
	this.$canvas = document.createElement("canvas");
	this.config = {};

	this.Init = function() {
		this.$body = document.querySelector("body");

		// Load Libraries
		FileLoader.LoadJs([
			"lib/jquery",
			"lib/mouse",
			"lib/pubsub",
			"lib/vue",
			"lib/gui",
			"lib/debugger",
			"lib/resampler",
			"lib/XAudioServer"
		]);
		FileLoader.LoadCss([
			"lib/normalize"
		]);

		// Load components
		FileLoader.Load([
			"components/window",
			"components/scrollbar",
			"components/popup",
			"components/tooltip"
		]);
		
		// Load Window Programs
		FileLoader.Load([
			"programs/DebugLCDProgram",
			"programs/DebugMemoryProgram",
			"programs/DebugStateProgram",
			"programs/DebugExecutionProgram",
			"programs/DebugBreakpointProgram",
			"programs/DebugSymbolProgram",
			"programs/DebugTraceProgram"
		]);

		// Load emulation core
		FileLoader.LoadJs([
			"emulation/coreOpCodes",
			"emulation/coreOpCodesCB",
			"emulation/core",
			"emulation/coreInitialize",
			"emulation/coreAudio",
			"emulation/coreGraphics",
			"emulation/coreGraphics",
			"emulation/coreMemory",
			"emulation/coreSaveState",
			"emulation/coreDebugger",
			"emulation/coreMetaData",
			
		]);
		FileLoader.LoadJs(["emulation/EmulationSymbols"]);

		// Load awakening project files
		FileLoader.LoadCss(["awakening/awakening"]);
		FileLoader.LoadJs(["awakening/GameBoyIO"]);

		// Capture window resize events to notify all windows
		// Todo: move to window component
		window.addEventListener("resize", this.PositionDebugWindows.bind(this));
		
		// Check for autoload config
		FileLoader.LoadJs(["config"],{
			success: this.LoadConfig.bind(this)
		});

/*
delete me
		FileLoader.LoadJs(["assets/rom/la_rom"]);
		FileLoader.LoadJs(["assets/rom/la_savestate"], function(){
			PubSub.immediateExceptions = true;
			
			this.InitEmulator();
			this.LoadSaveState();
			this.InitInput();
			this.InitDebugger();
		}.bind(this));
*/
	},

	this.ShowLoading = function() {
		this.$body.classList.add('state-loading');
	};
	
	this.HideLoading = function() {
		this.$body.classList.remove('state-loading');
		this.$body.classList.add('state-ready');
	};

	this.LoadConfig = function() {

		if( this.config.rom ){

			this.ShowLoading();

			FileLoader.LoadJs([this.config.rom], {
				success: function() {

					this.Launch();

					// Check for a save state in the config
					if( this.config.state ) {
						FileLoader.LoadJs([this.config.state], {
							success: this.LoadSaveState.bind(this)
						},);
					} else {
						this.HideLoading();

						if( this.config.start_paused ){
							window.setTimeout(function(){
								pause();
								PubSub.publish('Debugger.Execution.Pause');
								PubSub.publish('Debugger.JumpToCurrent');
							},2000);
						}
					}
				}.bind(this)
			});
		}
	}

	this.Launch = function() {
		// Everything should be setup in the config and ready to go
		this.InitEmulator();
		this.InitInput();
		this.InitDebugger();
	}

	this.InitEmulator = function() {
		var rom = atob(rom_base64);
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
		this.programs['symbol'] = DebugProgramFactory.Create("symbol");
		this.programs['trace'] = DebugProgramFactory.Create("trace");

		// Position windows on Debugger.Refresh
		PubSub.subscribe("Debugger.Refresh", function() {
			this.PositionDebugWindows();
			for( var p in this.programs ) {
				this.programs[p].window.Refresh();
			}
		}.bind(this));

		window.setTimeout(function(){
			PubSub.publish('Debugger.Refresh');
			PubSub.publish('Debugger.JumpToCurrent');
		},50);
	}

	this.PositionDebugWindows = function() {

		// Todo: Fix tracking or update
		if( !this.programs['lcd'] ) {
			return;
		}

		// I have no idea why this is not correct for my monitor
		// var screen_height = window.innerHeight;

		var screen_height = visualViewport.height;
		var screen_width = window.innerWidth;

		this.programs['lcd'].window.top = 0;
		this.programs['lcd'].window.left = 0;
		this.programs['lcd'].window.width = 160;
		this.programs['lcd'].window.height = 144;
		
		this.programs['breakpoint'].window.top = 144;
		this.programs['breakpoint'].window.left = 0;
		this.programs['breakpoint'].window.width = 160;
		this.programs['breakpoint'].window.height = Math.floor(screen_height*.5) - 144;	
	
		this.programs['state'].window.top = Math.floor(screen_height*.5);;
		this.programs['state'].window.left = 0;
		this.programs['state'].window.width = 160;
		this.programs['state'].window.height = Math.floor(screen_height*.5);

		this.programs['memory'].window.top = Math.floor(screen_height*.5);
		this.programs['memory'].window.left = 160;
		this.programs['memory'].window.width = 600;
		this.programs['memory'].window.height = Math.floor(screen_height*.5);
		
		this.programs['execution'].window.top = 0;
		this.programs['execution'].window.left = 160;
		this.programs['execution'].window.width = 400;
		this.programs['execution'].window.height = Math.floor(screen_height*.5);	

		this.programs['symbol'].window.top = 0;
		this.programs['symbol'].window.left = 560;
		this.programs['symbol'].window.width = 200;
		this.programs['symbol'].window.height = Math.floor(screen_height*.5);

		this.programs['trace'].window.top = 0;
		this.programs['trace'].window.left = -160;
		this.programs['trace'].window.width = 160;
		this.programs['trace'].window.height = Math.floor(screen_height*.5);	
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
		var state = state_base64;
		this.emulator.returnFromState(state);
		this.HideLoading();

		if( this.config.start_paused ){
			window.setTimeout(function(){
				pause();
				PubSub.publish('Debugger.Execution.Pause');
				PubSub.publish('Debugger.JumpToCurrent');
			},50);
		}
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