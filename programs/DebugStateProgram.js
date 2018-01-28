var DebugStateProgram = function(emulation_core) {
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = `
		<div class='debug-state-window'>
			<div cass='debug-flags'>
		        <div class='debug-flag-row' v-for="row in flag_rows">
		            <div class='debug-flag' v-bind:class="{on: row.value}" v-bind:title="row.desc">{{row.label}}</div>
		        </div>
		    </div>
		    <div class='debug-registers'>
		        <div class='register-row' v-for="row in register_rows">
		            <div class='register-key'>{{row.register}}</div>
		            <div class='register-value memory-link' v-bind:data-register="row.register">{{row.value}}</div>
		        </div>
		    </div>

		    <div class='debug-stack'>
		        <div class='stack-row' v-for="row in stack_rows"  v-bind:class="{ current: row.current }">
		            <div class='stack-label'>{{row.label}}</div>
		            <div class='stack-address memory-link'>{{row.address}}</div>
		            <div class='stack-values memory-link'>
		                <div class='stack-value' v-for="value in row.values">{{value}}</div>
		            </div>
		        </div>
		    </div>
		</div>
	`;

	this.Init = function() {

		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	register_rows: [],
		  	stack_rows: [],
		  	flag_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-state-window');

		this.Refresh();

		this.window.$el.addEventListener("mouseover", function(e) {
			var $target = e.target;
			if( $target.classList.contains("register-value") ) {
				//console.log("hover");
			}
		}.bind(this));


		this.window.$el.addEventListener("mouseout", function(e) {
			var $target = e.target;
			if( $target.classList.contains("register-value") ) {
				//console.log("hover-end");
			}
		}.bind(this));

		// Left click
		this.window.$el.addEventListener("click", function(e) {
			var $target = e.target;
			if( $target.classList.contains("register-value") ) {
			}
			isRightMB = (e.which == 3); 
			console.log(isRightMB);
		}.bind(this));

		// Right Click
		this.window.$el.addEventListener("contextmenu", function(e) {
			var $target = e.target;
			if( $target.classList.contains("register-value") ) {
				this.popup = new Popup({
					value: true,
					$target: $target,
					callback: function() {
						var register = this.popup.settings.$target.getAttribute("data-register");
						var new_value = this.popup.$input.value;

						var low = new_value.substr(0,2);
						var high = new_value.substr(2,4);
					}.bind(this)
				})
				e.preventDefault();	
			}
			return false;
			
		}.bind(this));
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

		this.view.flag_rows = [
			{
				label: "Z",
				desc: "Zero - This bit is set when the result of a math operation is zero or two values match when using the CP instruction.",
				value: this.emulationCore.FZero
			},{
				label: "N",
				desc: "Subtraction - This bit is set if a subtraction was performed in the last math instruction.",
				value: this.emulationCore.FSubtract
			},{
				label: "H",
				desc: "Half Carry - This bit is set if a carry occurred from the lower nibble in the last math operation.",
				value: this.emulationCore.FHalfCarry
			},{
				label: "C",
				desc: "Carry Flag - This bit is set if a carry occurred from the last math operation or if register A is the smaller value when executing the CP instruction.",
				value: this.emulationCore.FCarry
			}
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