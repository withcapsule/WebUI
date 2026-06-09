export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/cdn/sdk.js") {
			return fetch("https://analytics.byseansingh.com/js/pa-hKo0_jTmBVNnhdPbwQxsT.js");
		}

		if (url.pathname === "/pa-api/event") {
			const headers = new Headers(request.headers);
			const visitorIp = request.headers.get("CF-Connecting-IP");
			if (visitorIp) headers.set("X-Forwarded-For", visitorIp);
			return fetch("https://analytics.byseansingh.com/api/event", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		return env.ASSETS.fetch(request);
	},
};
