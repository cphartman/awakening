var DebugTraceProgram = function(emulation_core) {
	this.$window = false;
	this.stackTop = 0;
	this.emulationCore = emulation_core;
	this.view = false;
	this.template = `
		<div class='debug-trace-window'>
			<div class='trace-toolbar'>
                <button class='trace-start' v-bind:class="[enabled ? 'selected' : '']">►</button>
                <button class='trace-stop'  v-bind:class="[enabled ? '' : 'selected']">■</button>
            </div>
		    <div class='trace-list'>
		        <div class='trace-row' v-for="trace in traces" v-bind:data-address="trace.address">
		            <div class='trace-type'>{{trace.type}}</div>
		            <div class='trace-address'><div class='trace-from execution-link'>{{trace.addressFrom}}</div> => <div class='trace-to execution-link'>{{trace.addressTo}}</div></div>
		     	</div>
		    </div>
		</div>
	`;

	this.Init = function() {
		var $vue_node =  this.window.$el;

		this.view = new Vue({
		  el: $vue_node,
		  data: {
		  	traces: [],
		  	enabled: false
		  }
		});

		// Vue destroys the original window dom element, restore the reference
		this.window.$el = this.view.$el;
		this.$window = this.view.$el.querySelector('.debug-trace-window');

		$(this.$window).on("click", ".trace-start", function(){
			PubSub.publish("Debug.Trace.Enable");
		});

		$(this.$window).on("click", ".trace-stop", function(){
			PubSub.publish("Debug.Trace.Disable");
		});

		PubSub.subscribe("Debug.Trace.Enable", function(evt, data){
			this.emulationCore.debug_trace.enabled = true;
			this.view.enabled = true;
		}.bind(this));


		PubSub.subscribe("Debug.Trace.Disable", function(evt, data){
			this.emulationCore.debug_trace.enabled = false;
			this.view.enabled = false;
			this.Refresh();
		}.bind(this));

		
	}

	this.Refresh = function() {
		this.view.traces = [];
		
		for( var i = 0; i < this.emulationCore.debug_trace.current.length; i++ ) {
			var trace = this.emulationCore.debug_trace.current[i]; 
			var t = {
				addressFrom: int2hex(trace.addressFrom,4),
				addressTo: int2hex(trace.addressTo,4),
				type: trace.type,
			};
			this.view.traces.push(t);
		}
	}
}