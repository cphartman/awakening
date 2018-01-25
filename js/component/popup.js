var Popup = function(settings) {
	
	this.$el = false;
	this.$target = false;
	this.value = false;
	this.$input = false;
	this.settings = {};

	this.PositionToMouse = function() {
		this.$el.style.top = Mouse.y+"px";
		this.$el.style.left = Mouse.x+"px";
		this.$el.style.transform = "translateY(-100%) translateX(-50%)";
	}

	this.PositionToElement = function() {
		var $target = this.settings.$target;
		var rect = $target.getBoundingClientRect();

		var offset = {
			top: rect.top + document.body.scrollTop,
			left: rect.left + document.body.scrollLeft
		};

		this.$el.style.top = offset.top+"px";
		this.$el.style.left = offset.left+"px";
		this.$input.style.width = $target.offsetWidth+"px";
		this.$input.style.height = $target.offsetHeight+"px";
	}

	this.Close = function() {
		this.$el.parentNode.removeChild(this.$el);
	}

	this.settings = settings;
	this.$el = document.createElement("div");
	this.$el.classList.add("popup");

	var template = "";

	if( settings.value ) {
		this.$input = document.createElement("input");

		this.$input.type = "text";
		this.$input.setAttribute("value", this.settings.$target.innerText);
		this.$input.spellcheck = false;
		template += this.$input.outerHTML;
	}

	if( settings.template ) {
		template += settings.template;
	}


	document.body.appendChild(this.$el);	
	this.$el.innerHTML = template;
	
	this.$input = this.$el.querySelector("input");
	if( this.$input ) {
		this.$input.focus();

		this.$input.addEventListener("blur",function(){
			awakening.emulator.debug_enable_input = true;
			this.settings.callback.call();
			this.Close();
		}.bind(this));
	}

	awakening.emulator.debug_enable_input = false;

	this.PositionToElement();

}