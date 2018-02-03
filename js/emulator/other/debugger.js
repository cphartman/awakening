function DebugMemoryInit() {
	window.setInterval(DebugMemoryUpdate, 150 );
	DebugMemoryUpdate();
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

function int2hex(val, len) {
	val = val.toString(16).toUpperCase();
	while( val.length < len ) {
		val = "0"+val;
	}
	return val;
}