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
			win.emulation_debugger = new DebugLCDProgram(win.emulation_core);
			break;

		case "memory":
			win.emulation_debugger = new DebugMemoryProgram(win.emulation_core);
			break;

		case 'state':
			win.emulation_debugger = new DebugStateProgram(win.emulation_core);
			break;

		case 'execution':
			win.emulation_debugger = new DebugExecutionProgram(win.emulation_core);
			break;

		case 'breakpoints':
			win.emulation_debugger = new DebugBrakepointsProgram(win.emulation_core);
			break;
	}

	// Setup Subscriptions
	win.DebugRefresh = function (msg, data) {
		this.WindowRefresh();
		this.emulation_debugger.Refresh();
		
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