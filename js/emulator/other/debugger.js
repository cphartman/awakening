var memoryTable = false;

function DebugMemoryInit() {
	//window.setInterval(DebugMemoryUpdate, 150 );
	//DebugMemoryUpdate();

	memoryTable = new MemoryTable();

	memoryTable.Init();
}

var MemoryTable = function() {
	this.row_width = 16;
	this.max = 0x10000;
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
			hide: true,
			end: 0xFE00,
			label: "ECHO"
		},{
			end: 0xFEA0,
			label: "&nbsp;OAM"
		},{
			hide: true,
			end: 0xFF00,
			label: "UNUSED"
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

		
		var $memory_window = document.querySelector("#debug-rom-window");
		var $memory_grid = document.querySelector("#memory-out");
		var $memory_tools = document.querySelector("#memory-toolbar");

		$memory_grid.style['height'] = (window.innerHeight - $memory_window.offsetTop - $memory_tools.offsetHeight)+"px";

		$memory_grid.innerHTML = out;
		

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

	return this;
}



function int2hex(val, len) {
	val = val.toString(16).toUpperCase();
	while( val.length < len ) {
		val = "0"+val;
	}
	return val;
}