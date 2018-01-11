var memoryTable = false;

function DebugMemoryInit() {
	//window.setInterval(DebugMemoryUpdate, 150 );
	//DebugMemoryUpdate();

	memoryTable = new MemoryTable();

	memoryTable.Init();
}

function DebugMemoryUpdate() {

	var out = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style='font-weight:bold'>00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span><br>";
	var slider_percent = document.querySelector("#memory-start").value/100;
	var slider_max = 65880;//Math.pow(2,14);
	var start_address_int = slider_percent * slider_max;
	
	// Round to nearset boundry
	var window_size = 0X1000;
	start_address_int = start_address_int - start_address_int%window_size;

	var start = parseInt(start_address_int,16);
	var length = 16;
	var val = 0;
	
	for( var y = 0; y < length; y++ ) {
		out += "<span style='font-weight:bold'>"+int2hex(start+(y*16),4)+"</span>";
		for( var x = 0; x < 16; x++ ) {
			var mem_index = start+(y*16)+x;
			if( mem_index < gameboy.memory.length ) {
				val = gameboy.memory[start+(y*16)+x];
				out += "&nbsp;"+int2hex(val,2);
			} else {
				out += "&nbsp;..";
			}
		}
		out += "<br>";
	}
	
	document.querySelector("#memory-out").innerHTML = out;

	document.querySelector("#memory-display").innerHTML = start_address_int.toString(16).toUpperCase();
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

		document.querySelector("#memory-out").innerHTML = out;

		this.Refresh();
	}

	this.Refresh = function(start, end) {
		
		if( typeof start == 'undefined' ) { start = 0; }
		if( typeof end == 'undefined' ) { end = gameboy.memory.length; }

		// Round to the nearest row
		start = start - start%this.row_width;

		// Update each memory row
		for( var i = start; i < end; i+=this.row_width ) {
			console.log("Updating row: "+int2hex(i,5));

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