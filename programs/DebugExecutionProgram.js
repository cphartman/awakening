var DebugExecutionProgram = function(emulation_core) {
	this.$window = false;
	this.addressTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.scrollbar = false;
	this.$toolbar = false;
	this.selected = false;
	this.template = `
		<div class='debug-execution-window'>
            <div class='execution-toolbar'>
                <button class='execution-play'>►</button>
                <button class='execution-pause'>‖</button>
                <button class='execution-step'>→</button>
            </div>       	
            <div class='execution-row' v-for="row in op_rows" v-bind:class="{ current: row.current, selected: row.selected }" v-bind:data-bank="row.bank" v-bind:data-address="row.address">
                <div v-if="row.functionStart">
            		Function() {
            	</div>
                <div class='execution-label'>{{row.label}}</div>
                <div class='execution-address'>{{row.address}}</div>
                <div class='execution-opcode'>{{row.opcode}}</div>
                <div class='execution-instruction'>
                	{{row.instruction}}
                </div>
                <div v-if="row.functionEnd">
            	} //
            	</div>
            </div>
        </div>
	`;
	
	this.Init = function() {

		var $vue_node = this.window.$el;
	
		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	op_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-execution-window');

		this.$play = this.$window.querySelector(".execution-play");
		this.$pause = this.$window.querySelector(".execution-pause");
		this.$step = this.$window.querySelector(".execution-step");

		var row_count = this.emulationCore.memory.length;
		this.scrollbar = new Scrollbar();
		this.scrollbar.Init(this.$window, row_count);
		this.scrollbar.callback = this.domEvents['scroll'].bind(this);

		this.Refresh();

		this.BindEvents();

		this.SetupExecutionLinkEvent();
	};

	this.BindEvents = function() {
		// Event listeners
		this.$play.addEventListener("click", this.domEvents['playClick'].bind(this));
		this.$pause.addEventListener("click", this.domEvents['pauseClick'].bind(this));
		this.$step.addEventListener("click", this.domEvents['stepClick']);	
		$(this.$window).on("click", ".execution-row", this.domEvents['rowClick']);

		$(this.window.$el).on("contextmenu", ".execution-row", this.domEvents['contextMenu']);


		// Subscriptions
		PubSub.subscribe("Debugger.Execution.Select",function(evt,data){
			this.selected = data;
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Execution.JumpTo",function (msg, data) {
			this.JumpTo(data);
			this.Refresh();
		}.bind(this));

	}

	this.domEvents = {
		'contextMenu': function(event){
			var hex_address_str = this.getAttribute("data-address");
			var address = parseInt(hex_address_str,16);
			var bank = this.getAttribute("data-bank");

			PubSub.publish("Debugger.Execution.Select", address);

			this.popup = new Popup({
				template: `
					<ul>
						<li data-click='breakpoint'>Add Breakpoint</li>
					</ul>
				`,
				address: address,
				bank: bank,
				clickHandler: function(label){
					switch(label) {
						case 'breakpoint':
							PubSub.publish("Debugger.Breakpoint.Update",{address:this.popup.settings.address, settings:{x:true, bank: this.popup.settings.bank}});
							PubSub.publish('Debugger.Refresh');
							break;
						case 'symbol':
							EmulationSymbols.Update({
								address: this.popup.settings.address,
								label: "Symbol",
								type: "Execution",
								namespace: "[New]"
							});
							PubSub.publish("Debugger.Refresh");
							break;
					}
							
				}.bind(this)
			});

			return false;
		},
		'rowClick': function() {
			var address_hex = this.getAttribute('data-address');
			var address = parseInt(address_hex,16);
			PubSub.publish("Debugger.Execution.Select",address);
		},
		'pauseClick': function(){
			
			this.$play.classList.remove("selected");
			this.$pause.classList.add("selected");

			pause();
			PubSub.publish('Debugger.Execution.Pause');
			PubSub.publish('Debugger.JumpToCurrent');
			return false;
		},
		'playClick': function(){

			this.$play.classList.add("selected");
			this.$pause.classList.remove("selected");

			clearLastEmulation();
			run();
			PubSub.publish('Debugger.Execution.Play');
			return false;
		},
		'stepClick': function(){

			// Pause game if it's runnig
			if( !(this.emulationCore.stopEmulator & 2) ) {
				pause();
				PubSub.publish('Debugger.JumpToCurrent');
				return;
			}

			// Play 1 frame
			this.emulationCore.stopEmulator = 1;
			
			cout("Starting the iterator.", 0);
			var dateObj = new Date();
			this.emulationCore.firstIteration = gameboy.lastIteration = dateObj.getTime();
			this.emulationCore.iterations = 0;
			this.emulationCore.debug_step = 1;
			this.emulationCore.run();

			// Pause
			this.emulationCore.stopEmulator |= 2;
			PubSub.publish('Debugger.JumpToCurrent');
			
			return;
		}.bind(this),
		'scroll': function(){
			this.addressTop = this.scrollbar.Get();
			this.Refresh();
		}.bind(this)
	}; 

	this.SetupExecutionLinkEvent = function() {
		$("body").on("click", ".execution-link", function(e){
			
			var string = this.innerText.toLowerCase().replace(/[^0-9a-f]/i,"");
			var address = parseInt(string,16);
			PubSub.publish("Debugger.Execution.JumpTo", address);
			PubSub.publish("Debugger.Execution.Select",address);

		});
	}

	this.JumpTo = function(address) {
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / 20);

		this.addressTop = address - Math.floor(row_count*.75);
		this.scrollbar.Set(this.addressTop);
		this.Refresh();
	}

	this.JumpToCurrent = function() {
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / 20);

		this.addressTop = this.emulationCore.programCounter - Math.floor(row_count*.75);
		this.scrollbar.Set(this.addressTop);
		this.Refresh();
	}

	this.Refresh = function() {
		var row_height = 20;
		var program_counter = this.emulationCore.programCounter;
		var address = this.addressTop;

		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / row_height);

		// Setup row data
		this.view.op_rows = [];
		for( var row_index = 0; row_index < row_count; row_index++ ) {
			var code = DebugReadMemory(address);
			var instruction = GameBoyCore.OpCode[code];
			var code_str = int2hex(code,2);
			var parameter_total = 0;

			// Get parameters
			if( typeof GameBoyCore.OpCodeParameters[code] != 'undefined' ) {
				parameter_total = GameBoyCore.OpCodeParameters[code];
				
				for( var p = 0; p < parameter_total; p++ ) {
					var next_code = DebugReadMemory(address + p + 1);
					code_str += " " + int2hex(next_code,2);
				}
			}

			this.view.op_rows[row_index] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				opcode: code_str,
				instruction: instruction,
				current: (program_counter == address),
				selected: (address == this.selected),
			}

			var bank = 0;
			if( address >= 0x4000 && address < 0x8000 ) {
				bank_rom_address = this.emulationCore.currentROMBank;
				bank = bank_rom_address/0x4000;
			}

			this.view.op_rows[row_index]['bank'] = bank;

			if( this.emulationCore.debug_trace.functions.start[address] ) {
				this.view.op_rows[row_index]['functionStart'] = "Function()";
			} else 	if( this.emulationCore.debug_trace.functions.end[address] ) {
				this.view.op_rows[row_index]['functionEnd'] = "} //";
			}

			// Increment row address for each parameter
			for( var p = 1; p <= parameter_total; p++ ) {
				if( address + 1 == program_counter ) {
					break;
				} else {
					address++;
				}
			}

			address++;
		}
	}
};