function track(name, props) {
	try {
		plausible(name, props ? { props } : undefined);
	} catch (e) {}
	if (window.umami) window.umami.track(name, props);
}
