window.addEventListener("click", function() {
	if( PopupManager.closeOnMissedClick ) {
		PopupManager.Close();
		PopupManager.closeOnMissedClick = false;
	}
});

var PopupManager = (function() {
	var _ = {};
	_.popupList = [];
	_.closeOnMissedClick = false;
	
	_.Register = function(popup) {
		this.popupList.push(popup);
	}

	_.Close = function() {
		while( this.popupList.length ) {
			var p = this.popupList.pop();
			p.Close();
		}
	}

	return _;
})();
var Popup = function(settings) {
	
	this.$el = false;
	this.$target = false;
	this.value = false;
	this.$input = false;
	this.settings = {};
	this.closed = false;
	this.settings = settings;

	this.PositionToMouse = function() {
		this.$el.style.top = Mouse.y+"px";
		this.$el.style.left = Mouse.x+"px";
		this.$el.style.transform = "translateY(-100%) translateX(-50%)";
	}

	this.PositionToTarget = function() {
		var $target = this.settings.target;
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
		if( !this.closed ) {
			this.closed = true;
			awakening.emulator.debug_enable_input = true;

			// Fire change clallback on close
			if( this.input_initial_value ) {
				if( this.input_initial_value != this.$input.value ) {
					this.settings.changeHandler.call();	
				}
			}

			this.$el.parentNode.removeChild(this.$el);
		}
	}

	this.ClickHandler = function(e) {
		var $target = e.currentTarget;
		var data = $target.getAttribute("data-click");
		if( typeof this.settings.clickHandler == "function" ) {
			(this.settings.clickHandler)(data);
		}
	}

	this.GetType = function() {
		if ( this.$el.querySelector("input") ) {
			return "input";
		}

		if ( this.$el.querySelector("ul") ) {
			return "menu";
		}
	}

	this.Init = function () {
		this.$el = document.createElement("div");
		this.$el.classList.add("popup");
		this.type = false;

		var template = "";

		if( settings.template ) {
			template += settings.template;
		}

		document.body.appendChild(this.$el);	
		this.$el.innerHTML = template;

		var type = this.GetType();
		
		if ( type == "input" ) {
			
			this.$input = this.$el.querySelector("input");
			this.input_initial_value = this.settings.target.innerText;
			this.$input.value = this.input_initial_value;
			this.$input.focus();

			this.$input.setSelectionRange(0, this.$input.value.length)
	
			this.$input.addEventListener("blur",function(){
				this.Close();	
			}.bind(this));

			this.$input.addEventListener("keyup", function(event){
				if( event.keyCode == 13 ) {
					this.Close();
				}
			}.bind(this));

			this.PositionToTarget();
		}

		if( type == "menu" ) {
			this.PositionToMouse();
			
			var click_elements = this.$el.querySelectorAll("*[data-click]");
			for( var i = 0; i < click_elements.length; i++ ) {
				click_elements[i].addEventListener( "click", this.ClickHandler.bind(this) );
			}

			PopupManager.closeOnMissedClick = true;
		}

		PopupManager.Register(this);

		awakening.emulator.debug_enable_input = false;
	}
	
	this.Init();	
}