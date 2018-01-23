var DebugStateProgram = function(emulation_core) {
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = document.querySelector;

	this.Init = function() {

		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	register_rows: [],
		  	stack_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
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