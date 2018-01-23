var DebugExecutionProgram = function(emulation_core) {
	this.$window = false;
	this.addressTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.scrollbar = false;
	this.$toolbar = false;
	
	this.InitWindow = function($window) {

		var $vue_node = $window.querySelector(".window-template");
	
		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	op_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.$window = this.view.$el.querySelector('.debug-execution-window');

		this.$play = this.$window.querySelector(".execution-play");
		this.$pause = this.$window.querySelector(".execution-pause");
		this.$step = this.$window.querySelector(".execution-step");

		var row_count = this.emulationCore.memory.length;
		this.scrollbar = new Scrollbar();
		this.scrollbar.Init(this.$window, row_count);
		this.scrollbar.callback = this.domEvents['scroll'].bind(this);

		this.Refresh();

		this.BindEvents();
	};

	this.BindEvents = function() {
		this.$play.addEventListener("click", this.domEvents['playClick'].bind(this));

		this.$pause.addEventListener("click", this.domEvents['pauseClick'].bind(this));

		this.$step.addEventListener("click", this.domEvents['stepClick'].bind(this));	
	}

	this.domEvents = {
		'pauseClick': function(){
			pause();
			PubSub.publish('Debugger.JumpToCurrent');
			return false;
		},
		'playClick': function(){
			run();
			return false;
		},
		'stepClick': function(){
			
			// Play 1 frame
			this.emulationCore.stopEmulator &= 1;
			
			cout("Starting the iterator.", 0);
			var dateObj = new Date();
			this.emulationCore.firstIteration = gameboy.lastIteration = dateObj.getTime();
			this.emulationCore.iterations = 0;
			this.emulationCore.debug_step = 1;
			this.emulationCore.run();

			// Pause
			this.emulationCore.stopEmulator |= 2;
			PubSub.publish('Debugger.JumpToCurrent');
			
			return;
		},
		'scroll': function(){
			this.addressTop = this.scrollbar.Get();
			this.Refresh();
		}
	}; 

	this.JumpToCurrent = function() {
		this.addressTop = this.emulationCore.programCounter - 5;
		this.scrollbar.Set(this.addressTop);
		this.Refresh();
	}

	this.Refresh = function() {
		var row_height = 20;
		var program_counter = this.emulationCore.programCounter;
		var address = this.addressTop;

		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / row_height);

		// Setup row data
		this.view.op_rows = [];
		for( var row_index = 0; row_index < row_count; row_index++ ) {
			var code = DebugReadMemory(address);
			var instruction = GameBoyCore.OpCode[code];
			var code_str = int2hex(code,2);
			var parameter_total = 0;

			// Get parameters
			if( typeof GameBoyCore.OpCodeParameters[code] != 'undefined' ) {
				parameter_total = GameBoyCore.OpCodeParameters[code];
				
				for( var p = 0; p < parameter_total; p++ ) {
					var next_code = DebugReadMemory(address + p + 1);
					code_str += " " + int2hex(next_code,2);
				}
			}

			this.view.op_rows[row_index] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				opcode: code_str,
				instruction: instruction,
				current: (program_counter == address),
			}

			// Increment row address for each parameter
			for( var p = 1; p <= parameter_total; p++ ) {
				if( address + 1 == program_counter ) {
					break;
				} else {
					address++;
				}
			}

			address++;
		}
	}
};