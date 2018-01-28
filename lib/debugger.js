var DebugProgramFactory = {};

DebugProgramFactory.Create = function(type) {

	var program = DebugProgramFactory.GetProgram(type);

	// Set program's template
	program.template = this.GetTemplate(type);

	// Set program's window
	program.window = new Window();
	program.window.Init(program.template);

	// Setup debugger program subscriptions
	PubSub.subscribe('Debugger.Refresh', function (msg, data) {
		this.window.Refresh();
		this.Refresh();
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

DebugProgramFactory.GetTemplate = function(type) {
	var template_selector = "#WINDOW-TEMPLATES > .debug-"+type+"-template";
	var $template = document.querySelector(template_selector);

	var template_html = "";
	if( $template ) {
		template_html = $template.innerHTML;	
	}

	return "<div class='debug-"+type+"-window'>"+template_html+"</div>";
}

var DebugReadMemory = function(start, length) {
	var results = [];

	if( typeof length == 'undefined' ) {
		length = 1;
	}

	for( var i = 0; i < length; i++ ) {
		var address = start + i;
		if( address > 0 && address < gameboy.memory.length ) {
			results[i] = gameboy.realMemory[address];
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