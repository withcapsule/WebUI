export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/pa-api/event") {
			const proxied = new Request("https://analytics.byseansingh.com/api/event", {
				method: request.method,
				headers: request.headers,
				body: request.body,
			});
			return fetch(proxied);
		}

		return env.ASSETS.fetch(request);
	},
};
