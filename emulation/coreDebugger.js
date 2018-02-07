GameBoyCore.prototype.DebugInit = function() {
	this.debug_step = 0;
	this.debug_breakpoints = {r:[],w:[],x:[]};
	this.debug_enable_input = true;
	this.memory_breakpoint_halt = false;
	this.debug_trace = {
		enabled: false,
		visited: {},
		current: [],
		limit: 10,
		depth_counter: 0,
		functions: {
			'start': {},
			'end': {}
		}
	};
};

GameBoyCore.prototype.CompileBreakpoints = function(breakpoints) {
	this.debug_breakpoints = {
		r: {},
		w: {},
		x: {},
	};

	for( var i in breakpoints ) {
		var breakpoint = breakpoints[i];
		if( breakpoint.r ) {
			this.debug_breakpoints.r[breakpoint.address] = {bank: breakpoint.bank};
		}
		if( breakpoint.w ) {
			this.debug_breakpoints.w[breakpoint.address] = {bank: breakpoint.bank};
		}
		if( breakpoint.x ) {
			this.debug_breakpoints.x[breakpoint.address] = {bank: breakpoint.bank};
		}
	}
}

GameBoyCore.prototype.initMemoryProxy = function() {
	this.realMemory = this.memory;

	var proxy_handler = {
		get: function(target, address) {

			if( !this.memory_read_external ) {
				if( !this.memory_breakpoint_halt ) {
					if( this.debug_breakpoints.r[address] ) {
						// Fire halt memory read interrupt
						this.memory_breakpoint_halt = true;
						PubSub.publish('Debugger.JumpToCurrent');
						PubSub.publish('Debugger.Memory.JumpTo', address);
					}
				}
			}
			return this.realMemory[address];
		}.bind(this),

		set: function(target, address, value, receiver) {
			if( this.debug_breakpoints.w[address] ) {
				this.memory_breakpoint_halt = true;
				PubSub.publish('Debugger.JumpToCurrent');
				PubSub.publish('Debugger.Memory.JumpTo', address);
			}

			// Early out to prevent write
			if( this.speculative_execute ) {
				return 1;
			}

			this.realMemory[address] = value;
			return 1;
  		}.bind(this)
	}
	this.memory = new Proxy(this,proxy_handler);
}

GameBoyCore.prototype.backup = {
	registerA: false,
	registerB: false,
	registerC: false,
	registerD: false,
	registerE: false,
	registersHL: false,

	CPUTicks: false,
	programCounter: false,
	FZero: false,
	FHalfCarry: false,
	FSubtract: false,
	FCarry: false,
	doubleSpeedShifter: false,
	stackPointer: false,
	skipPCIncrement: false,
	IRQEnableDelay: false,
};



GameBoyCore.prototype.BackupExecutionState = function() {
	for( var i in this.backup ) {
		this.backup[i] = this[i];
	}
}

GameBoyCore.prototype.RevertExecutionState = function() {

	this.speculativeResults = [];
	for( var i in this.backup ) {
		this.speculativeResults[i] = this[i];
		this[i] = this.backup[i];
	}
}

GameBoyCore.prototype.SpeculativeExecute = function() {
	
	this.speculative_execute = true;

	this.BackupExecutionState();

	var opcodeToExecute = this.memoryReader[this.programCounter](this, this.programCounter);
	
	//Increment the program counter to the next instruction:
	this.programCounter = (this.programCounter + 1) & 0xFFFF;
	//Check for the program counter quirk:
	if (this.skipPCIncrement) {
		this.programCounter = (this.programCounter - 1) & 0xFFFF;
		this.skipPCIncrement = false;
	}
	//Get how many CPU cycles the current instruction counts for:
	this.CPUTicks = this.TICKTable[opcodeToExecute];

	this.OPCODE[opcodeToExecute](this);
	
	this.RevertExecutionState();

	this.speculative_execute = false;
}

GameBoyCore.prototype.DebugTrace = function() {
	if( !this.debug_trace.enabled ) {
		return;
		this.debug_trace.current = [];
	}
	var address = this.programCounter;
	var current_op = this.memoryReader[address](this, address);

	var bank_low = 16384; // 0x4000
	var bank_high = 32768; // 0x8000

	// Check for debug tracing
	for( var i = 0; i < MetaStackRegisteres['inc'].length; i++ ) {
		var inc_op = MetaStackRegisteres['inc'][i];
		if( current_op == inc_op ) {
			
			var jump_location = this.speculativeResults["programCounter"];
			
			if( Math.abs(jump_location-address) < 4 ) {
				break;
			}

			var trace = {
				addressFrom: address,
				addressTo: jump_location,
				type: 'inc',
				bank: ( address >= bank_low && address < bank_high ? this.currentROMBank/bank_low : false ),
				depth: this.debug_trace.depth_counter
			};

			this.debug_trace.depth_counter++;

			this.debug_trace.visited[address] = trace;

			this.debug_trace.current.push(trace);

			this.debug_trace.functions.start[jump_location] = 1;
		}
	}

	// Check for debug tracing
	for( var i = 0; i < MetaStackRegisteres['dec'].length; i++ ) {
		var dec_op = MetaStackRegisteres['dec'][i];
		if( current_op == dec_op ) {
			
			var jump_location = this.speculativeResults["programCounter"];
			
			if( Math.abs(jump_location-address) < 4 ) {
				break;
			}

			var trace = {
				addressFrom: address,
				addressTo: jump_location,
				type: 'dec',
				bank: ( address >= bank_low && address < bank_high ? this.currentROMBank/bank_low : false ),
				depth: this.debug_trace.depth_counter
			};

			this.debug_trace.depth_counter++;

			this.debug_trace.visited[address] = trace;

			this.debug_trace.current.push(trace);

			this.debug_trace.functions.end[jump_location] = 1;
		}
	}

	this.debug_trace.current = this.debug_trace.current.slice(this.debug_trace.limit*-1);

}
