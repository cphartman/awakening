var DebugMemoryProgram = function(emulation_core) {
	this.row_width = 16;
	this.max = 0x10000;

	this.emulationCore = emulation_core;
	this.view = false;
	this.addressTop = 0;

	this.Init = function() {

		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: this.window.$el,
		  data: {
		  	memory_rows: [],
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-memory-window');

		var row_count = this.emulationCore.memory.length / 16;
		this.scrollbar = new Scrollbar();
		this.scrollbar.Init(this.$window, row_count);
		this.scrollbar.callback = this.domEvents['scroll'].bind(this);

		this.Refresh();

		PubSub.subscribe("Debugger.Memory.JumpTo",function (msg, data) {
			this.JumpTo(data);
			this.Refresh();
		}.bind(this));

		this.SetupMemoryLinkEvent();
	}

	this.JumpTo = function(address) {
		this.addressTop = (address & 0xFFF0) - 0x0080;
		if( this.addressTop < 0 ) {
			this.addressTop = 0;
		}

		this.scrollbar.Set(this.addressTop);
		this.Refresh();
		
		Vue.nextTick(function(){
			this.SelectText(address);	
		}.bind(this));		
	}

	this.SelectText = function(address) {
		var $address = document.querySelector(".memory-value[data-address='"+int2hex(address,4)+"']");
		if( $address ) {
			selection = window.getSelection();        
	        range = document.createRange();
	        range.selectNodeContents($address);
	        selection.removeAllRanges();
	        selection.addRange(range);
	    }
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

	this.Refresh = function() {
		var row_height = 20;
		
		var window_height = this.$window.offsetHeight;
		row_count = Math.floor(window_height / row_height);
		
		this.view.memory_rows = [];
		for( var i = 0; i < row_count; i++ ) {

			var address = this.addressTop + i*16;

			this.view.memory_rows[i] = {
				label: GameBoyCore.GetMemoryRegion(address),
				address: int2hex(address,4),
				columns: []
			}

			for( var m = 0; m < 16; m++ ) {
				var column_address = address+m;
				var value = DebugReadMemory(column_address);
				this.view.memory_rows[i].columns[m] = {
					address: int2hex(column_address,4),
					value: int2hex(value,2),
				};
			}
		}
	}

	this.domEvents = {
		'scroll': function() {
			this.addressTop = this.scrollbar.Get() * 16;
			this.Refresh();
		}
	}

	return this;
};
