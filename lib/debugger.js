var DebugProgramFactory = {};

DebugProgramFactory.Create = function(type) {

	var program = DebugProgramFactory.GetProgram(type);

	// Set program's window
	program.window = new Window();
	program.window.Init(program.template);
	program.window.title = type;

	// Setup debugger program subscriptions
	PubSub.subscribe('Debugger.Refresh', function (msg, data) {
		this.window.Refresh();
		this.Refresh();

		DebugProgramFactory.SetupSymbols(this);
	}.bind(program));

	if( program.JumpToCurrent ) {
		PubSub.subscribe('Debugger.JumpToCurrent', function (msg, data) {
			this.JumpToCurrent();
			PubSub.publish('Debugger.Refresh');
		}.bind(program));
	}

	program.Init();
	return program;
}

DebugProgramFactory.SetupSymbols = function(program) {

	// Probably leaking memory, should keep better track of tooltips
	$(program.$window).find(".tooltip").each(function(){
		$(this).removeClass("tooltip");
		$(this).attr('data-tooltip','');
	});

	$(program.$window).find(".memory-link").each(function(){
		var hex_address = this.innerText;
		var address = parseInt(hex_address,16);

		var symbol = EmulationSymbols.Lookup(address);
		if( symbol ) {
			new Tooltip(this, symbol);
		}
	});
}

DebugProgramFactory.GetProgram = function(type) {

	var emulation_core = awakening.emulator;
	
	// Create program object
	var program = false;
	switch( type ) {
		case "lcd":
			program = new DebugLCDProgram(emulation_core);
			break;

		case "memory":
			program = new DebugMemoryProgram(emulation_core);
			break;

		case 'state':
			program = new DebugStateProgram(emulation_core);
			break;

		case 'execution':
			program = new DebugExecutionProgram(emulation_core);
			break;

		case 'breakpoint':
			program = new DebugBreakpointProgram(emulation_core);
			break;

		default:
			debugger;
	}

	return program;
}

var DebugReadMemory = function(start, length) {
	var results = [];

	if( typeof length == 'undefined' ) {
		length = 1;
	}

	for( var i = 0; i < length; i++ ) {
		var address = start + i;
		if( address > 0 && address < gameboy.memory.length ) {
			gameboy.memory_read_external = true;
			results[i] = gameboy.memoryRead(address);
			gameboy.memory_read_external = false;
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

var DebugWriteMemory = function(address, values) {
	if( typeof values != 'array' ) {
		values = [values];
	}

	// TODO: bounds checking
	for( var i = 0; i < values.length; i++ ) {
		gameboy.realMemory[address+i] = values[i];
	}
}


function int2hex(val, len) {
	val = val.toString(16).toUpperCase();
	while( val.length < len ) {
		val = "0"+val;
	}
	return val;
}