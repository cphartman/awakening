var Window = function() {
	this.root = document.querySelector("body");

	this.$window = false;
	this.programWindow = false;

	this.top = 0;
	this.left = 0;
	this.width = 100;
	this.height = 100;
	this.$el = false;
	this.title = "";
	this.template = `
		<div class='window-padding'>
			<div class='window-titleBar'>
				<div class='window-titleName'></div>
				<div class='window-titleTools'></div>
			</div>
			<div class='program-window'></div>
		</div>
	`;

	this.Init = function(template) {
		this.$window = document.createElement("div");
		this.$window.classList.add("window");
		this.$window.innerHTML = this.template;
		
		this.$el = this.$window.querySelector(".program-window");
		this.$el.innerHTML = template;

		this.$title = this.$window.querySelector(".window-titleName");
		this.$title.innerHTML = this.title;
		
		this.root.appendChild(this.$window);
		this.Refresh();
	}

	this.Refresh = function() {
		this.$window.style['top'] = this.top+"px";
		this.$window.style['left'] = this.left+"px";
		this.$window.style['width'] = this.width+"px";
		this.$window.style['height'] = this.height+"px";

		this.$title.innerHTML = this.title;
	}

	this.ProgramSize = function() {
		return {
			width: this.$programWindow.offsetWidth,
			height: this.$programWindow.offsetHeight
		};
	}
}
