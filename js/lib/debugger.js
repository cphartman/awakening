var DebuggerWindowFactory = {};

DebuggerWindowFactory.Create = function(type) {

	var win = new Window();
	var template = this.GetTemplate(type);
	win.InitTemplate(template);
	
	// Debugger window specific properties
	win.emulation_core = awakening.emulator;
	win.emulation_debugger = false;
	
	switch( type ) {
		case "lcd":
			win.emulation_debugger = new DebugLCD(win.emulation_core);
			break;

		case "memory":
			win.emulation_debugger = new DebugMemory(win.emulation_core);
			break;

		case 'state':
			win.emulation_debugger = new DebugState(win.emulation_core);
			break;

		case 'execution':
			win.emulation_debugger = new DebugExecution(win.emulation_core);
			break;

		case 'breakpoints':
			win.emulation_debugger = new DebugBrakepoints(win.emulation_core);
			break;
	}

	// Setup Subscriptions
	win.DebugRefresh = function (msg, data) {
		this.emulation_debugger.Refresh();
		this.WindowRefresh();
	}.bind(win);
	PubSub.subscribe('Debugger.Refresh', win.DebugRefresh);

	if( win.emulation_debugger.JumpToCurrent ) {
		win.DebugJumpToCurrent = function (msg, data) {
			this.emulation_debugger.JumpToCurrent();
			PubSub.publish('Debugger.Refresh');
		}.bind(win);
		PubSub.subscribe('Debugger.JumpToCurrent', win.DebugJumpToCurrent);
	}

	win.emulation_debugger.InitWindow(win.$el);

	return win;
	
}

DebuggerWindowFactory.GetTemplate = function(type) {
	var $template = document.querySelector("#WINDOW-TEMPLATES > .debug-"+type+"-window");

	if( $template ) {
		return $template.outerHTML;	
	} else {
		return "<div class='debug-"+type+"-window'></div>";
	}
}

Debugger = function(emulator_core) {

	// Available debugger tools
	this.debug_memory = false;
	this.debug_state = false;
	this.debug_memory = false;

	this.emulationCore = emulator_core;

	this.InitMemoryWindow = function($window){
		
	};

	this.InitExecutionWindow = function($window) {
		this.debug_execution = new DebugExecution($window, this.emulationCore);
		this.debug_execution.Init();
	}

	this.InitStateWindow = function($window) {
		this.debug_state = new DebugState($window, this.emulationCore);
		this.debug_state.Init();
	}

	this.Refresh = function() {
		this.debug_memory.Refresh();
		this.debug_execution.Refresh();
		this.debug_state.Refresh();
	}

	this.JumpToCurrent = function() {
		this.debug_state.JumpToCurrent();
		this.debug_execution.JumpToCurrent();
	}
}

var DebugState = function(emulation_core) {
	this.type = "state";
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = document.querySelector;

	this.InitWindow = function($window) {
		
		var $vue_node = $window.querySelector(".window-template");

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	register_rows: [],
		  	stack_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.$window = this.view.$el.querySelector('.debug-state-window');

		this.Refresh();
	}

	this.JumpToCurrent = function() {
		this.stackTop = this.emulationCore.stackPointer + 6;
		this.Refresh();
	}

	this.Refresh = function() {
		
		var registerF = ((this.emulationCore.FZero) ? 0x80 : 0) | 
						((this.emulationCore.FSubtract) ? 0x40 : 0) | 
						((this.emulationCore.FHalfCarry) ? 0x20 : 0) | 
						((this.emulationCore.FCarry) ? 0x10 : 0);

		this.view.register_rows = [
			{
				register: "AF",
				value: int2hex(this.emulationCore.registerA,2)+int2hex(registerF,2),
			},{
				register: "BC",
				value: int2hex(this.emulationCore.registerB,2)+int2hex(this.emulationCore.registerC,2),
			},{
				register: "DE",
				value: int2hex(this.emulationCore.registerD,2)+int2hex(this.emulationCore.registerE,2),
			},{
				register: "HL",
				value: int2hex(this.emulationCore.registersHL,4),
			},{
				register: "SP",
				value: int2hex(this.emulationCore.stackPointer,4),
			},{
				register: "PC",
				value: int2hex(this.emulationCore.programCounter,4),
			},
		];


		var row_height = 20;
		var stack_height = this.$window.offsetHeight;
		
		row_count = Math.floor(stack_height / row_height);
		
		for( var i = 0; i < row_count; i++ ) {
			var address = this.stackTop - i*2;
			var mem = DebugReadMemory(address, 2);

			this.view.stack_rows[i] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				current: (address == gameboy.stackPointer ),
				values: [
					int2hex(mem[1],2),
					int2hex(mem[0],2)
					]
			};
		}
	}
}

var DebugExecution = function(emulation_core) {
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


var DebugLCD = function(emulation_core) {
	this.emulation_core = emulation_core;
	this.$window = false;

	this.InitWindow = function($window) {
		this.$window = $window;
		this.$window.innerHTML = "<div class='debug-lcd-window'></div>";
		this.$window.querySelector(".debug-lcd-window").appendChild(this.emulation_core.canvas);
	}

	this.Refresh = function() {
	}
}


var DebugMemory = function(emulation_core) {
	this.row_width = 16;
	this.max = 0x10000;

	this.emulationCore = emulation_core;
	this.view = false;
	this.addressTop = 0;

	this.InitWindow = function($window) {
		var $vue_node = $window.querySelector(".window-template");

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	memory_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.$window = this.view.$el.querySelector('.debug-memory-window');

		var row_count = this.emulationCore.memory.length / 16;
		this.scrollbar = new Scrollbar();
		this.scrollbar.Init(this.$window, row_count);
		this.scrollbar.callback = this.domEvents['scroll'].bind(this);

		this.Refresh();
	}

	this.Refresh = function() {

		var row_height = 20;
		
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / row_height);
		
		this.view.memory_rows = [];
		for( var i = 0; i < row_count; i++ ) {

			var address = this.addressTop + i*16;

			this.view.memory_rows[i] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				values: []
			}

			for( var m = 0; m < 16; m++ ) {
				var value = DebugReadMemory(address+m);
				this.view.memory_rows[i].values[m] = int2hex(value,2);
			}
		}
	}

	this.domEvents = {
		'scroll': function() {
			this.addressTop = this.scrollbar.Get() * 16;
			this.Refresh();
		}
	}

	return this;
};

var DebugExecutionBreakpoint = function(emulation_core, address) {
	this.emulationCore = emulation_core;
	this.address = address;
	this.enable = true;
	this.type = "EXECUTION"
	this.onBreak = false;
	this.$window = false;

	this.emulationCore.debug_breakpoints.push(this);

	this.InitWindow = function($window) {
		this.$window = $window;
	}
}


var DebugReadMemory = function(start, length) {
	var results = [];

	if( typeof length == 'undefined' ) {
		length = 1;
	}

	for( var i = 0; i < length; i++ ) {
		var address = start + i;
		if( address > 0 && address < gameboy.memory.length ) {
			results[i] = gameboy.memory[address];
		} else {
			results[i] = 0;
		}

	}

	if( length == 1 ) {
		return results[0];
	} else {
		return results;
	}
};


function int2hex(val, len) {
	val = val.toString(16).toUpperCase();
	while( val.length < len ) {
		val = "0"+val;
	}
	return val;
}