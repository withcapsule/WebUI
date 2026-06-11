export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/cdn/sdk.js") {
			const res = await fetch("https://analytics.byseansingh.com/js/pa-hKo0_jTmBVNnhdPbwQxsT.js");
			const text = await res.text();
			const patched = text.replaceAll("https://analytics.byseansingh.com/api/event", "/pa-api/event");
			return new Response(patched, {
				headers: {
					"Content-Type": "application/javascript",
					"Cache-Control": "public, max-age=3600",
				},
			});
		}

		if (url.pathname === "/pa-api/event") {
			const headers = new Headers(request.headers);
			const visitorIp = request.headers.get("CF-Connecting-IP");
			if (visitorIp) {
				headers.set("X-Forwarded-For", visitorIp);
				headers.set("X-Real-IP", visitorIp);
			}
			headers.delete("host");
			return fetch("https://analytics.byseansingh.com/api/event", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		if (url.pathname === "/u.js") {
			const res = await fetch("https://analytics2.byseansingh.com/script.js");
			const headers = new Headers(res.headers);
			headers.set("Cache-Control", "public, max-age=86400");
			return new Response(res.body, { status: res.status, headers });
		}

		if (url.pathname === "/cdn/u" || url.pathname === "/api/send") {
			const headers = new Headers(request.headers);
			const visitorIp = request.headers.get("CF-Connecting-IP");
			if (visitorIp) {
				headers.set("X-Forwarded-For", visitorIp);
				headers.set("X-Real-IP", visitorIp);
			}
			headers.delete("host");
			return fetch("https://analytics2.byseansingh.com/api/send", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		return env.ASSETS.fetch(request);
	},
};
