export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/cdn/d") {
			const headers = new Headers(request.headers);
			headers.set(
				"X-Forwarded-For",
				request.headers.get("CF-Connecting-IP") || "",
			);
			headers.delete("host");

			return fetch("https://analytics.byseansingh.com/api/event", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		if (url.pathname === "/u.js") {
			const res = await fetch(
				"https://a1.withcapsule.dev./script.js",
			);
			const headers = new Headers(res.headers);
			headers.set("Cache-Control", "public, max-age=86400");
			return new Response(res.body, { status: res.status, headers });
		}

		if (url.pathname === "/cdn/u" || url.pathname === "/api/send") {
			const headers = new Headers(request.headers);
			headers.set(
				"X-Forwarded-For",
				request.headers.get("CF-Connecting-IP") || "",
			);
			headers.delete("host");

			return fetch("https://a1.withcapsule.dev/api/send", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		return env.ASSETS.fetch(request);
	},
};
