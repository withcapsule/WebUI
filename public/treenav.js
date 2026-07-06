(function () {
	var toggle = document.querySelector(".tree-toggle");
	var menu = document.querySelector(".tree-menu");
	if (!toggle || !menu) return;

	function open() {
		menu.hidden = false;
		toggle.setAttribute("aria-expanded", "true");
		if (typeof track === "function") track("Nav Menu Opened");
	}
	function close() {
		menu.hidden = true;
		toggle.setAttribute("aria-expanded", "false");
	}

	toggle.addEventListener("click", function (e) {
		e.stopPropagation();
		if (menu.hidden) open();
		else close();
	});
	document.addEventListener("click", function (e) {
		if (!menu.hidden && !menu.contains(e.target) && e.target !== toggle) close();
	});
	document.addEventListener("keydown", function (e) {
		if (e.key === "Escape" && !menu.hidden) {
			close();
			toggle.focus();
		}
	});
})();
