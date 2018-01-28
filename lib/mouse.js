var Mouse = {
	x: false,
	y: false,
}

Mouse.Update = function(e) {
	Mouse.x = e.pageX;
	Mouse.y = e.pageY;
}

window.setTimeout(function(){
	document.addEventListener('mousemove', Mouse.Update, false);
	document.addEventListener('mouseenter', Mouse.Update, false);
},100);
