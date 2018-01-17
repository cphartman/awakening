var debug_memory = false;
var debug_execution = false;

function DebugInit() {
	debug_memory = new DebugMemory();
	debug_memory.Init();

	debug_execution = new DebugExecution();
	debug_execution.Init();

	debug_state = new DebugState();
	debug_state.Init();
}

function DebugRefresh() {
	debug_memory.Refresh();
	debug_execution.Refresh();
	debug_state.Refresh();
}

var DebugState = function() {
	this.$window = false;
	this.$table = false;
	this.$stack = false;
	this.stackTop = 0;

	this.Init = function() {
		var height_px = document.querySelector("#execution-table").offsetHeight;

		this.$table = document.querySelector("#debug-state-table");
		this.$stack = document.querySelector("#debug-state-stack");

		stack_row_height = 20;
		stack_total_height = height_px;
		stack_row_count = Math.floor(stack_total_height / stack_row_height);
		stack_html = "";

		for( var i = 0; i < stack_row_count; i++ ) {
			stack_html += "<div class='stack stack-"+i+"'></div>";
		}

		this.$stack.innerHTML = stack_html;


		this.JumpToCurrent();
	}

	this.JumpToCurrent = function() {
		this.stackTop = gameboy.stackPointer - 6;
		this.Refresh();
	}

	this.Refresh = function() {
		
		var registerF = ((gameboy.FZero) ? 0x80 : 0) | ((gameboy.FSubtract) ? 0x40 : 0) | ((gameboy.FHalfCarry) ? 0x20 : 0) | ((gameboy.FCarry) ? 0x10 : 0);
		var table = "";

		table += "<div>af = "+int2hex(gameboy.registerA,2)+""+int2hex(registerF,2)+"</div>";
		table += "<div>bc = "+int2hex(gameboy.registerB,2)+""+int2hex(gameboy.registerC,2)+"</div>";
		table += "<div>de = "+int2hex(gameboy.registerD,2)+""+int2hex(gameboy.registerE,2)+"</div>";
		table += "<div>hl = "+int2hex(gameboy.registersHL,4)+"</div>";
		table += "<div>sp = "+int2hex(gameboy.stackPointer,4)+"</div>";
		table += "<div>pc = "+int2hex(gameboy.programCounter,4)+"</div>";

		this.$table.innerHTML = table;

		var $stackArr = document.querySelectorAll(".stack");
		var stack_pointer = gameboy.stackPointer;
		for( var i = 0; i < $stackArr.length; i++ ) {
			var $stack = $stackArr[i];
			var address = this.stackTop + i*2;
			var mem = DebugReadMemory(address, 2);
			$stack.innerHTML = int2hex(address,4) + ": " + int2hex(mem[1],2) + int2hex(mem[0],2);

			if( address == stack_pointer ) {
				$stack.classList.add('stack-pointer');
			} else {
				$stack.classList.remove('stack-pointer');
			}
		}
	}

}

var DebugExecution = function() {

	this.currentAddress = 0;

	this.$window = false;
	this.$table = false;
	this.$toolbar = false;
	this.opcodes = ["NOP","LD BC, nn","LD (BC), A","INC BC","INC B","DEC B","LD B, n","RLCA","LD (nn), SP",
	"ADD HL, BC","LD A, (BC)","DEC BC","INC C","DEC C","LD C, n","RRCA","STOP","LD DE, nn","LD (DE), A","INC DE",
	"INC D","DEC D","LD D, n","RLA","JR n","ADD HL, DE","LD A, (DE)","DEC DE","INC E","DEC E","LD E, n","RRA",
	"JR NZ, n","LD HL, nn","LDI (HL), A","INC HL","INC H","DEC H","LD H, n","DAA","JR Z, n","ADD HL, HL","LDI A, (HL)",
	"DEC HL","INC L","DEC L","LD L, n","CPL","JR NC, n","LD SP, nn","LDD (HL), A","INC SP","INC (HL)","DEC (HL)",
	"LD (HL), n","SCF","JR C, n","ADD HL, SP","LDD A, (HL)","DEC SP","INC A","DEC A","LD A, n","CCF","LD B, B","LD B, C",
	"LD B, D","LD B, E","LD B, H","LD B, L","LD B, (HL)","LD B, A","LD C, B","LD C, C","LD C, D","LD C, E","LD C, H",
	"LD C, L","LD C, (HL)","LD C, A","LD D, B","LD D, C","LD D, D","LD D, E","LD D, H","LD D, L","LD D, (HL)","LD D, A",
	"LD E, B","LD E, C","LD E, D","LD E, E","LD E, H","LD E, L","LD E, (HL)","LD E, A","LD H, B","LD H, C","LD H, D",
	"LD H, E","LD H, H","LD H, L","LD H, (HL)","LD H, A","LD L, B","LD L, C","LD L, D","LD L, E","LD L, H","LD L, L",
	"LD L, (HL)","LD L, A","LD (HL), B","LD (HL), C","LD (HL), D","LD (HL), E","LD (HL), H","LD (HL), L","HALT",
	"LD (HL), A","LD A, B","LD A, C","LD A, D","LD A, E","LD A, H","LD A, L","LD, A, (HL)","LD A, A","ADD A, B",
	"ADD A, C","ADD A, D","ADD A, E","ADD A, H","ADD A, L","ADD A, (HL)","ADD A, A","ADC A, B","ADC A, C","ADC A, D",
	"ADC A, E","ADC A, H","ADC A, L","ADC A, (HL)","ADC A, A","SUB A, B","SUB A, C","SUB A, D","SUB A, E","SUB A, H",
	"SUB A, L","SUB A, (HL)","SUB A, A","SBC A, B","SBC A, C","SBC A, D","SBC A, E","SBC A, H","SBC A, L","SBC A, (HL)",
	"SBC A, A","AND B","AND C","AND D","AND E","AND H","AND L","AND (HL)","AND A","XOR B","XOR C","XOR D","XOR E","XOR H",
	"XOR L","XOR (HL)","XOR A","OR B","OR C","OR D","OR E","OR H","OR L","OR (HL)","OR A","CP B","CP C","CP D","CP E","CP H",
	"CP L","CP (HL)","CP A","RET !FZ","POP BC","JP !FZ, nn","JP nn","CALL !FZ, nn","PUSH BC","ADD, n","RST 0","RET FZ",
	"RET","JP FZ, nn","Secondary OP Code Set:","CALL FZ, nn","CALL nn","ADC A, n","RST 0x8","RET !FC","POP DE","JP !FC, nn",
	"0xD3 - Illegal","CALL !FC, nn","PUSH DE","SUB A, n","RST 0x10","RET FC","RETI","JP FC, nn","0xDB - Illegal",
	"CALL FC, nn","0xDD - Illegal","SBC A, n","RST 0x18","LDH (n), A","POP HL","LD (0xFF00 + C), A","0xE3 - Illegal",
	"0xE4 - Illegal","PUSH HL","AND n","RST 0x20","ADD SP, n","JP, (HL)","LD n, A","0xEB - Illegal","0xEC - Illegal",
	"0xED - Illegal","XOR n","RST 0x28","LDH A, (n)","POP AF","LD A, (0xFF00 + C)","DI","0xF4 - Illegal","PUSH AF","OR n",
	"RST 0x30","LDHL SP, n","LD SP, HL","LD A, (nn)","EI","0xFC - Illegal","0xFD - Illegal","CP n","RST 0x38","RLC B",
	"RLC C","RLC D","RLC E","RLC H","RLC L","RLC (HL)","RLC A","RRC B","RRC C","RRC D","RRC E","RRC H","RRC L","RRC (HL)",
	"RRC A","RL B","RL C","RL D","RL E","RL H","RL L","RL (HL)","RL A","RR B","RR C","RR D","RR E","RR H","RR L","RR (HL)",
	"RR A","SLA B","SLA C","SLA D","SLA E","SLA H","SLA L","SLA (HL)","SLA A","SRA B","SRA C","SRA D","SRA E","SRA H",
	"SRA L","SRA (HL)","SRA A","SWAP B","SWAP C","SWAP D","SWAP E","SWAP H","SWAP L","SWAP (HL)","SWAP A","SRL B","SRL C",
	"SRL D","SRL E","SRL H","SRL L","SRL (HL)","SRL A","BIT 0, B","BIT 0, C","BIT 0, D","BIT 0, E","BIT 0, H","BIT 0, L",
	"BIT 0, (HL)","BIT 0, A","BIT 1, B","BIT 1, C","BIT 1, D","BIT 1, E","BIT 1, H","BIT 1, L","BIT 1, (HL)","BIT 1, A",
	"BIT 2, B","BIT 2, C","BIT 2, D","BIT 2, E","BIT 2, H","BIT 2, L","BIT 2, (HL)","BIT 2, A","BIT 3, B","BIT 3, C",
	"BIT 3, D","BIT 3, E","BIT 3, H","BIT 3, L","BIT 3, (HL)","BIT 3, A","BIT 4, B","BIT 4, C","BIT 4, D","BIT 4, E",
	"BIT 4, H","BIT 4, L","BIT 4, (HL)","BIT 4, A","BIT 5, B","BIT 5, C","BIT 5, D","BIT 5, E","BIT 5, H","BIT 5, L",
	"BIT 5, (HL)","BIT 5, A","BIT 6, B","BIT 6, C","BIT 6, D","BIT 6, E","BIT 6, H","BIT 6, L","BIT 6, (HL)","BIT 6, A",
	"BIT 7, B","BIT 7, C","BIT 7, D","BIT 7, E","BIT 7, H","BIT 7, L","BIT 7, (HL)","BIT 7, A","RES 0, B","RES 0, C",
	"RES 0, D","RES 0, E","RES 0, H","RES 0, L","RES 0, (HL)","RES 0, A","RES 1, B","RES 1, C","RES 1, D","RES 1, E",
	"RES 1, H","RES 1, L","RES 1, (HL)","RES 1, A","RES 2, B","RES 2, C","RES 2, D","RES 2, E","RES 2, H","RES 2, L",
	"RES 2, (HL)","RES 2, A","RES 3, B","RES 3, C","RES 3, D","RES 3, E","RES 3, H","RES 3, L","RES 3, (HL)","RES 3, A",
	"RES 3, B","RES 4, C","RES 4, D","RES 4, E","RES 4, H","RES 4, L","RES 4, (HL)","RES 4, A","RES 5, B","RES 5, C",
	"RES 5, D","RES 5, E","RES 5, H","RES 5, L","RES 5, (HL)","RES 5, A","RES 6, B","RES 6, C","RES 6, D","RES 6, E",
	"RES 6, H","RES 6, L","RES 6, (HL)","RES 6, A","RES 7, B","RES 7, C","RES 7, D","RES 7, E","RES 7, H","RES 7, L",
	"RES 7, (HL)","RES 7, A","SET 0, B","SET 0, C","SET 0, D","SET 0, E","SET 0, H","SET 0, L","SET 0, (HL)","SET 0, A",
	"SET 1, B","SET 1, C","SET 1, D","SET 1, E","SET 1, H","SET 1, L","SET 1, (HL)","SET 1, A","SET 2, B","SET 2, C",
	"SET 2, D","SET 2, E","SET 2, H","SET 2, L","SET 2, (HL)","SET 2, A","SET 3, B","SET 3, C","SET 3, D","SET 3, E",
	"SET 3, H","SET 3, L","SET 3, (HL)","SET 3, A","SET 4, B","SET 4, C","SET 4, D","SET 4, E","SET 4, H","SET 4, L",
	"SET 4, (HL)","SET 4, A","SET 5, B","SET 5, C","SET 5, D","SET 5, E","SET 5, H","SET 5, L","SET 5, (HL)","SET 5, A",
	"SET 6, B","SET 6, C","SET 6, D","SET 6, E","SET 6, H","SET 6, L","SET 6, (HL)","SET 6, A","SET 7, B","SET 7, C",
	"SET 7, D","SET 7, E","SET 7, H","SET 7, L","SET 7, (HL)","SET 7, A"];

	this.op_parameters = {

		0x06: 1,
		0x0e: 1,
		0x16: 1,
		0x1e: 1,
		0x26: 1,
		0x2e: 1,

		// LD A, (nn)
		0xfa: 2,
		// LD A, #
		0x3e: 1,

		// ld (NN), A
		0xea: 2,

		0xe0: 1,

		0xf0: 1,

		0x01: 2,
		0x11: 2,
		0x21: 2,
		0x31: 2,

		0xf8: 1,

		0x08: 2,

		0xe8: 1,

		0xc3: 2,

		0xc2: 2,
		0xca: 2,
		0xd2: 2,
		0xda: 2,

		0x18: 1,

		0x20: 1,
		0x28: 1,
		0x30: 1,
		0x38: 1,

		0xcd: 2,

		0xc4: 2,
		0xcc: 2,
		0xd4: 2,
		0xdc: 2,

		0xfe: 2

	};

	this.Init = function() {
		this.$window = document.querySelector('#debug-execution-window');
		this.$toolbar = document.querySelector("#exeution-toolbar");
		this.$table = document.querySelector('#execution-table');
		this.$heightbox = document.querySelector('#debug-execution-window .heightbox');

		this.$play = document.querySelector("#execution-play");
		this.$pause = document.querySelector("#execution-pause");
		this.$step = document.querySelector("#execution-step");

		this.$table.style['top'] = this.$toolbar.offsetHeight+"px";
		this.$table.style['height'] = (this.$window.offsetHeight - this.$toolbar.offsetHeight)+"px";

		this.InitTable();
		this.Refresh();

		this.BindEvents();
	};

	this.BindEvents = function() {
		this.$play.addEventListener("click", this.domEvents['playClick'].bind(this));

		this.$pause.addEventListener("click", this.domEvents['pauseClick'].bind(this));

		this.$step.addEventListener("click", this.domEvents['stepClick'].bind(this));

		this.$table.addEventListener("scroll", this.domEvents['tableScroll'].bind(this));
	
	}

	this.domEvents = {
		'pauseClick': function(){
			pause();
			this.JumpToCurrent();
			debug_state.JumpToCurrent();

			debug_memory.Refresh();

			return false;
		},
		'playClick': function(){
			run();
			return false;
		},
		'stepClick': function(){
			
			// Play 1 frame
			gameboy.stopEmulator &= 1;
			cout("Starting the iterator.", 0);
			var dateObj = new Date();
			gameboy.firstIteration = gameboy.lastIteration = dateObj.getTime();
			gameboy.iterations = 0;
			gameboy.debug_step = 1;
			gameboy.run();

			// Pause
			gameboy.stopEmulator |= 2;

			this.JumpToCurrent();
			debug_state.JumpToCurrent();
			return;
		},
		'tableScroll': function(){
			this.currentAddress = Math.floor(this.$table.scrollTop/this.$table.scrollHeight * gameboy.memory.length);
			this.Refresh();
			return false;
		}
	}; 



	this.InitTable = function() {

		var row_height = 20;
		var row_count = Math.floor(this.$table.offsetHeight / row_height);

		var table_html = "<div class='op-wrapper'>";
		for( var i = 0; i < row_count; i++ ) {
			table_html += "<div class='op op-"+i+"'>"+i+"</div>";
		}
		table_html += "</div>"

		this.$table.innerHTML = table_html;

		this.JumpToCurrent();
	}

	this.JumpToCurrent = function() {
		this.currentAddress = gameboy.programCounter - 5;
		
		this.Refresh();
	}

	this.Refresh = function() {
		
		var row_height = 20;
		var program_counter = gameboy.programCounter;
		var address = this.currentAddress;
		var $op_list = document.querySelectorAll(".op");

		// Setup row data
		for( var row_index = 0; row_index < $op_list.length; row_index++ ) {
			var code = DebugReadMemory(address);
			var op = this.opcodes[code];
			var code_str = int2hex(code,2);
			var parameter_total = 0;

			// Get parameters
			if( typeof this.op_parameters[code] != 'undefined' ) {
				parameter_total = this.op_parameters[code];
				
				for( var p = 0; p < parameter_total; p++ ) {
					var next_code = DebugReadMemory(address + p + 1);
					code_str += " " + int2hex(next_code,2);
				}
			}

			// Draw row from data
			var $row = $op_list[row_index];
			$row.innerHTML = int2hex(address,4) + ": " + code_str + " => " + op;

			// Check if on a special row
			if( program_counter == address ) {
				$row.classList.add('program-counter');
			} else {
				$row.classList.remove('program-counter');
			}

			address += parameter_total;
			address++;
		}

		this.$table.scrollTop = (this.currentAddress / gameboy.memory.length) * this.$table.scrollHeight;
	}
};

var DebugReadMemory = function(start, length) {
	var results = [];

	if( typeof length == 'undefined' ) {
		length = 1;
	}

	for( var i = 0; i < length; i++ ) {
		if( i < gameboy.memory.length ) {
			results[i] = gameboy.memory[start+i];
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

var DebugMemory = function() {
	this.row_width = 16;
	this.max = 0x10000;

	this.$window = false;
	this.$table = false;
	this.$toolbar = false;

	this.HARDWARE_MEMORY_RANGES = [{
			end: 0x4000,
			label: "ROM0"
		},{
			end: 0x8000,
			label: "ROM1"
		},{
			end: 0xA000,
			label: "VRAM"
		},{
			end: 0xC000,
			label: "SRAM"
		},{
			end: 0xE000,
			label: "WRAM"
		},{
			end: 0xFE00,
			label: "ECHO"
		},{
			end: 0xFEA0,
			label: "&nbsp;OAM"
		},{
			end: 0xFF00,
			label: "----"
		},{
			end: 0xFF80,
			label: "&nbsp;I/O"
		},{
			end: 0xFFFF,
			label: "HRAM"
	}];

	this.Init = function() {
		var rows = this.max / this.row_width;
		var out = "";
		for( var r = 0; r < rows; r++ ) {

			var row_address = r*16;
			var row = "";
			row += "<div class='memory-row memory-row-"+row_address+"'>";

			var hide_row = false;
			for( var i = 0; i<=this.HARDWARE_MEMORY_RANGES.length; i++) {

				if( row_address < this.HARDWARE_MEMORY_RANGES[i].end ) {
					row += "<span class='memory-row-label'>"+this.HARDWARE_MEMORY_RANGES[i].label+" : </span>";		
					hide_row = this.HARDWARE_MEMORY_RANGES[i].hide;
					break;
				}
			}

			if( hide_row ) {
				continue;
			}

			row += "<span class='memory-row-start'>"+int2hex(row_address,5)+"</span>";
			row += "<span class='memory-row-data'>";	

			for( var x = 0; x < this.row_width; x++ ) {
				row += "&nbsp;..";
			}

			row += "</span'>";	

			row += "</div>";

			out += row;
		}

		
		this.$window = document.querySelector("#debug-rom-window");
		this.$table = document.querySelector("#memory-out");
		this.$toolbar = document.querySelector("#memory-toolbar");

		this.$table.style['height'] = (window.innerHeight - this.$window.offsetTop - this.$toolbar.offsetHeight)+"px";

		this.$table.innerHTML = out;
		

		this.Refresh();
	}

	this.Refresh = function(start, end) {
		
		if( typeof start == 'undefined' ) { start = 0; }
		if( typeof end == 'undefined' ) { end = gameboy.memory.length; }

		// Round to the nearest row
		start = start - start%this.row_width;

		// Update each memory row
		for( var i = start; i < end; i+=this.row_width ) {
			//console.log("Updating row: "+int2hex(i,5));

			var $row_data = document.querySelector("#memory-out .memory-row-"+i+" .memory-row-data");

			if( $row_data ) {
				var out = "";
				for( var x = 0; x < this.row_width; x++ ) {
					val = gameboy.memory[i+x];
					out += "&nbsp;"+int2hex(val,2);
				}
				$row_data.innerHTML = out;
			}
		}
	}

	this.StartMonitor = function() {

	}

	this.StopMonitor = function() {

	}

	return this;
};



function int2hex(val, len) {
	val = val.toString(16).toUpperCase();
	while( val.length < len ) {
		val = "0"+val;
	}
	return val;
}