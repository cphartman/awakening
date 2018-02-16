var DebugExecutionProgram = function(emulation_core) {
	this.$window = false;
	this.addressTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.scrollbar = false;
	this.$toolbar = false;
	
	this.selectedBank = -1;
	this.selected = false;

	this.$rows = new Array(0x4000);
	this.template = `
		<div class='debug-execution-window'>
            <div class='execution-toolbar'>
            	<button class='memory-region'>ROM {{bank}}</button>
				
                <button class='execution-play'>►</button>
                <button class='execution-pause'>‖</button>
                <button class='execution-step'>→</button>
            </div>
            <div class='execution-rows'></div>
        </div>
	`;

	/* 	
    <div class='execution-row' v-for="row in op_rows" v-bind:class="{ current: row.current, selected: row.selected }" v-bind:data-bank="row.bank" v-bind:data-address="row.address">
        <div class='ececution-comment'>{{row.comment}}</div>
        <div class='execution-address'>{{row.address}}</div>
        <div class='execution-opcode'>{{row.opcode}}</div>
        <div class='execution-instruction'>{{row.instruction}}</div>
    </div>
	*/

	this.SetupRows = function() {
		var $row_container = this.$window.querySelector(".execution-rows");

		for( var i = 0; i < this.$rows.length; i++ ) {
			var address = i;

			var $row = document.createElement("div");
			$row.classList.add("execution-row");
			$row.setAttribute("data-address",address);

			var $comment = document.createElement("div");
			$comment.classList.add("execution-comment");
			$comment.setAttribute("data-address",address);
			
			var $data = document.createElement("div");
			$data.classList.add("execution-data");
			$data.setAttribute("data-address",address);

			$row.appendChild($comment);
			$row.appendChild($data);
			$row_container.appendChild($row);

			this.$rows[address] = {
				comment: $comment,
				data: $data
			}
		}
	}
	
	this.Init = function() {

		this.$window = this.window.$el.querySelector(".debug-execution-window");

		this.$play = this.$window.querySelector(".execution-play");
		this.$pause = this.$window.querySelector(".execution-pause");
		this.$step = this.$window.querySelector(".execution-step");

		this.SetupRows();

		this.BindEvents();

		this.SetupExecutionLinkEvent();
	};

	this.RefreshViewport = function() {

		var viewport = this.GetViewport();
		var length = viewport[1]-viewport[0];
		var program_counter = this.emulationCore.programCounter;
		var bank = this.selectedBank;

		var read_memory = DebugReadMemory(viewport[0], length);

		for( var i = 0; i < length; i++ ) {
			var row_index = viewport[0] + i;
			var $data = this.$rows[row_index]['data'];
			var address = parseInt($data.getAttribute("data-address"),10);

			var code = DebugReadMemory(address);
			var instruction = GameBoyCore.OpCode[code];
			var address_hex = int2hex(address,4);
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

	        
			$data.innerHTML = address_hex + " " + code_str + " " + instruction;

			if( program_counter == address ) {
				$data.classList.add("current");
			} else {
				$data.classList.remove("current")
			}

			if( address == this.selectedAddress ) {
				$data.classList.add("selected");
			} else {
				$data.classList.remove("selected");
			}

		}
	}

	this.SetBank = function(bank) {

		if( bank == this.selectedBank ) {
			return;
		}

		this.selectedBank = bank;

		for( var i = 0; i < 0x4000; i++ ) {
			
			var address = i;
			if( bank ) {
				address += 0x4000;
			}

			var row_index = address % 0x4000;
			var $data = this.$rows[row_index]['data'];
			$data.setAttribute("data-address",address);

			// Update toolbar rom bank # 
			this.$window.querySelector(".memory-region").innerHTML = "ROM: "+int2hex(bank,2);
		}
	}

	this.GetViewport = function() {

		var $container = this.$window.querySelector(".execution-rows");
		var $rows = $container.querySelectorAll(".execution-row");
		var scrollTop = $container.scrollTop;
		var viewportHeight = $container.offsetHeight;
		var viewportStartAddress = 0;
		var viewportEndAddress = 0;

		if( viewportHeight == 0 ) {
			return [0,0];
		}

		for( var i = 0; i < $rows.length; i++ ) {
			var $row = $rows[i];
			
			if( !viewportStartAddress && $row.offsetTop >= scrollTop ) {
				viewportStartAddress = parseInt($row.getAttribute("data-address"),10);
			}

			if( $row.offsetTop > scrollTop + viewportHeight || i + 1 == $rows.length ) {
				viewportEndAddress = parseInt($row.getAttribute("data-address"),10);
				
				break;
			}
		}

		return [viewportStartAddress,viewportEndAddress];
	}

	this.BindEvents = function() {
		// Event listeners
		this.$play.addEventListener("click", this.domEvents['playClick'].bind(this));
		this.$pause.addEventListener("click", this.domEvents['pauseClick'].bind(this));
		this.$step.addEventListener("click", this.domEvents['stepClick']);	
		$(this.$window).on("click", ".execution-row", this.domEvents['rowClick']);
		this.$window.querySelector(".execution-rows").addEventListener("scroll", this.Refresh.bind(this));;	

		$(this.window.$el).on("contextmenu-disabled", ".execution-row", this.domEvents['contextMenu']);


		// Subscriptions
		PubSub.subscribe("Debugger.Execution.Select",function(evt,data){
			this.selected = data;
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Execution.JumpTo",function (msg, data) {
			//this.JumpTo(data);
			this.Refresh();
		}.bind(this));
		PubSub.subscribe("Debugger.Execution.Pause", function(){
			this.$play.classList.remove("selected");
			this.$pause.classList.add("selected");
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

	this.addressToRow = function(address) {
		var row_index = address % 0x4FFF;
		return this.$row[row_index];
	}

	this.JumpTo = function(address, bank) {

		var row_index = address % 0x4000;
		var $row = this.$rows[row_index]['data'];
		var $container = this.$window.querySelector(".execution-rows");
		$container.scrollTop = $row.offsetTop - $container.offsetHeight/2;

		this.SetBank(bank);
		this.selectedAddress = address;
		this.Refresh();
	}

	this.JumpToCurrent = function() {
		var pc = this.emulationCore.programCounter;
		var bank = 0;
		if( pc > 0x4000 && pc < 0x8000 ) {
			bank = this.emulationCore.currentROMBank/0x4000;
		}
		this.JumpTo(pc, bank);

		this.Refresh();
	}

	this.Refresh = function() {

		this.RefreshViewport();

	}
};