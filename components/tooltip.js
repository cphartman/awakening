var Tooltip = function($el, tipText) {
	this.$el = $el;
	this.$el.classList.add('tooltip');
	this.$el.setAttribute("data-tooltip", tipText);
}