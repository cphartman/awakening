var DebugMemoryProgram = function(emulation_core) {
	this.row_width = 16;
	this.max = 0x10000;

	this.emulationCore = emulation_core;
	this.view = false;
	this.addressTop = 0;
	this.breakpoints = [];
	this.selectedMemBank = "ROM0";
	this.selectedRomBank = 1;

	this.$bytes = new Array(0xFFFF);

	this.selectedAddress = -1;
	this.template = `
		<div class="debug-memory-window">
			<div class='memory-row-toolbar'>
				<label>Region:</label>
				<button class='memory-region selected' data-region='ROM0'>ROM 00</button>
				<button class='memory-region' data-region='VRAM'>VRAM</button>
				<button class='memory-region' data-region='SRAM'>SRAM</button>
				<button class='memory-region' data-region='WRAM'>WRAM</button>
				<button class='memory-region' data-region='OAM'>OAM</button>
				<button class='memory-region' data-region='I/O'>I/O</button>
				<button class='memory-region' data-region='HRAM'>HRAM</button>
			</div>
			<div class='memory-row-header'>
				<span>00</span><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span>
				<span>08</span><span>09</span><span>0A</span><span>0B</span><span>0C</span><span>0D</span><span>0E</span><span>0F</span>
			</div>

			<div class='memory-region-tabs'>

			</div>
	            

        </div>
	`;

	this.Refresh = function() {
		this.RefreshViewport();
	}

	this.RefreshViewport = function() {

		var viewport = this.GetViewport();
		var length = viewport[1]-viewport[0];
		
		var read_memory = DebugReadMemory(viewport[0], length);

		for( var i = 0; i < read_memory.length; i++ ) {
			
			var address = viewport[0] + i;

			if( address == 0xdb00 ) {
				//debugger;
			}

			var value = read_memory[i];
			var value_hex = int2hex(value,2);
			this.$bytes[address]['data'].innerHTML = value_hex;

			if( address == this.selectedAddress ) {
				this.$bytes[address]['data'].classList.add("selected");
			} else {
				this.$bytes[address]['data'].classList.remove("selected");
			}

			var symbol = ( EmulationSymbols ? EmulationSymbols.Lookup(address, this.emulationCore.name) : false);
			if( symbol ) {

				if( symbol.label ) {
					this.$bytes[address]['symbol'].innerHTML = symbol.label;
				}

				if( symbol.value ) {
					this.$bytes[address]['data'].innerHTML = symbol.value;
				}

			} else {
				this.$bytes[address]['symbol'].innerHTML = "";
			}
		}
	}

	this.GetViewport = function() {
		// Get row ranges to refresh
		var bank = this.selectedMemBank;
		var region = GameBoyCore.GetMemoryRegion(bank);
		var $tab = this.window.$el.querySelector(".memory-region-tab[data-region='"+bank+"']");
		var $rows = $tab.querySelectorAll(".memory-row");
		var scrollTop = $tab.scrollTop;
		var viewportHeight = $tab.offsetHeight;
		var viewportStartAddress = 0;
		var viewportEndAddress = 0;

		for( var i = 0; i < $rows.length; i++ ) {
			var $row = $rows[i];
			
			if( !viewportStartAddress && $row.offsetTop >= scrollTop ) {
				viewportStartAddress = parseInt($row.getAttribute("data-address"),10);

				// Get row before
				viewportStartAddress -= 0x10;
				if( viewportStartAddress < region.start) {
					viewportStartAddress = region.start;
				}
			}

			if( $row.offsetTop > scrollTop + viewportHeight || i + 1 == $rows.length ) {
				viewportEndAddress = parseInt($row.getAttribute("data-address"),10);
				
				// This will break on the first address in the row, viewport includes full row
				viewportEndAddress += 0x10;

				break;


			}
		}

		return [viewportStartAddress,viewportEndAddress];
	}

	this.SetTab = function(region_name) {
		for( var i = 0; i < GameBoyCore.MemoryRegions.length; i++ ) {
			if( region_name == GameBoyCore.MemoryRegions[i].label ) {

				this.selectedMemBank = region_name;

				if( !this.window.$el.querySelector(".memory-region-tab[data-region='"+region_name+"']") ) {
					this.InitializeTab(region_name);
				}

				if( this.window.$el.querySelector(".memory-region.selected") ) {
					this.window.$el.querySelector(".memory-region.selected").classList.remove("selected");	
				}

				if( this.window.$el.querySelector(".memory-region-tab.selected") ) {
					this.window.$el.querySelector(".memory-region-tab.selected").classList.remove("selected");
				}

				this.window.$el.querySelector(".memory-region[data-region='"+region_name+"']").classList.add("selected");
				this.window.$el.querySelector(".memory-region-tab[data-region='"+region_name+"']").classList.add("selected");

			}
		}
	}

	this.InitializeTab = function(region_name) {

		var $tabs = this.window.$el.querySelector(".memory-region-tabs");

		var region = GameBoyCore.GetMemoryRegion(region_name);

		// Get new tab or clear current tab
		var $tab = this.window.$el.querySelector(".memory-region-tab[data-region='"+region.label+"']");
		if( !$tab ) {
			var $tab = document.createElement("div");
			$tab.classList.add("memory-region-tab");
			$tab.setAttribute("data-region", region.label)
			$tabs.appendChild($tab);

			$tab.addEventListener("scroll",function(e){
				this.Refresh();
			}.bind(this));
		} else {
			debugger;
			$tab.innerHTML = "";
		}
		
		var $row = false;
		var $bytes = false;
		var $symbols = false;

		// Create rows and bytes
		for( var address = region.start; address < region.end; address++ ) {

			var col = address % 0x10;
			var row = address-col;
			var row_hex = int2hex(row,4);

			if( col == 0 ) {
				$row = document.createElement("div");
				$row.classList.add("memory-row");
				$row.setAttribute("data-address", address);
				$row.setAttribute("data-address-hex", int2hex(address,4));

				$bytes = document.createElement("div");
				$bytes.classList.add("memory-bytes");

				$symbols = document.createElement("div");
				$symbols.classList.add("memory-symbols");

				$row.appendChild($symbols);
				$row.appendChild($bytes);

			}

			// Create byte dom elementes
			var $byte = document.createElement("div");
			$byte.classList.add("memory-byte");
			$byte.classList.add("address-"+address);
			$byte.setAttribute("data-address",address);
			$bytes.appendChild($byte);

			// Create symbol dom elements
			$symbol = document.createElement("div");
			$symbol.classList.add("memory-symbol");
			$symbol.classList.add("address-"+address);
			$symbol.setAttribute("data-address",address);
			$symbols.appendChild($symbol);

			// Cache element references
			if( this.$bytes[address] ) {
				throw exception("should not happen");
			}
			this.$bytes[address] = {
				data: $byte,
				symbol: $symbol
			};

			// Row complete
			if( col == 0x0F ) {
				$tab.appendChild($row);
			}
		}

	}

	this.Init = function() {

		this.SetTab("ROM0");

		PubSub.subscribe("Debugger.Memory.JumpTo",function (msg, data) {
			this.JumpTo(data);
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Memory.Select",function (msg, data) {
			this.selectedAddress = data;
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Breakpoints.Set",function (msg, data) {
			this.breakpoints = data;
			this.Refresh();
		}.bind(this));

		PubSub.subscribe("Debugger.Symbols.Changed", function(msg, data) {
			// TODO: fix
			this.InitializeTab("MEM0");
		});

		this.SetupMemoryLinkEvent();

		$(this.window.$el).on("click", ".memory-region", function(event){
			this.window.$el.querySelector(".memory-region.selected").classList.remove("selected");
			event.target.classList.add("selected");

			var dataRegion = event.target.getAttribute("data-region");
			this.SetTab(dataRegion);
			this.Refresh();
		}.bind(this));

		$(this.window.$el).on("click", ".memory-byte", function(event){
			
			var selected = $(this).hasClass('selected');

			if( selected ) {
				this.popup = new Popup({
					template: "<input>",
					target: this,
					address: this.getAttribute("data-address"),
					changeHandler: function() {
						var address = this.popup.settings.address;
						var value_hex = this.popup.$input.value;
						var value_int = parseInt(value_hex, 16);

						// Clamp value
						value_int = (value_int > 0xff ? 0xff : value_int);
						value_int = (value_int < 0 ? 0 : value_int);
						
						DebugWriteMemory(address, value_int);
						PubSub.publish('Debugger.Refresh');
					}.bind(this)
				})
			} else {
				var address = parseInt(this.getAttribute("data-address"),10);
				PubSub.publish("Debugger.Memory.Select", address);
			}
		});

		$(this.window.$el).on("contextmenu", ".memory-byte", function(event){
			var address = this.getAttribute("data-address");
			
			PubSub.publish("Debugger.Memory.Select", address);

			this.popup = new Popup({
				template: `
					<ul>
						<li data-click='breakpoint'>Add Breakpoint</li>
						<li data-click='symbol'>Add Symbol</li>
						<li data-click='value'>Edit Value</li>
					</ul>
				`,
				address: address,
				clickHandler: function(label){
					switch(label) {
						case 'breakpoint':
							PubSub.publish("Debugger.Breakpoint.Update",{address:this.popup.settings.address, settings:{r:true,w:true}});
							PubSub.publish('Debugger.Refresh');
							break;
						case 'symbol':
							EmulationSymbols.Update({
								address: this.popup.settings.address,
								label: "Symbol",
								type: "Memory",
								namespace: ""
							});
							PubSub.publish("Debugger.Refresh");
							window.setTimeout(function(){
								//PubSub.publish("Debugger.Symbol.Edit",this.popup.settings.address);
							}.bind(this),1);
							break;
					}
							
				}.bind(this)
			});

			return false;
		});
	}

	this.JumpTo = function(address) {
		var region = GameBoyCore.GetMemoryRegion(address);
		this.SetTab(region.label);

		window.setTimeout(function(){
			var col = address%0x10;
			var row = address - col;
			var $tab = this.window.$el.querySelector(".memory-region-tab[data-region='"+region.label+"']");
			var $row = this.window.$el.querySelector(".memory-row[data-address='"+row+"']");
			$tab.scrollTop = $row.offsetTop - $tab.offsetHeight/2;

			this.selectedAddress = address;
			//this.scrollbar.Set(this.addressTop/16);
			this.Refresh();
		}.bind(this),100);
			
	}

	this.SetupMemoryLinkEvent = function() {
		document.body.addEventListener("click", function(e){
			
			var $iterator = e.target;
			while( $iterator ) {
				if( $iterator.classList.contains("memory-link") ) {
					break;
				}
				$iterator = $iterator.parentElement;
			}

			if( $iterator ) {
				var string = $iterator.innerText.toLowerCase().replace(/[^0-9a-f]/i,"");
				var address = parseInt(string,16);
				PubSub.publish("Debugger.Memory.JumpTo", address);
			}

		});
	}

	this.domEvents = {
		'scroll': function() {
			//this.addressTop = this.scrollbar.Get() * 16;
			// this.Refresh();
		}
	}

	return this;
};
