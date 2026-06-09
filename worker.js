export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/cdn/sdk.js") {
			return fetch("https://analytics.byseansingh.com/js/pa-hKo0_jTmBVNnhdPbwQxsT.js");
		}

		if (url.pathname === "/pa-api/event") {
			return fetch("https://analytics.byseansingh.com/api/event", {
				method: request.method,
				headers: request.headers,
				body: request.body,
			});
		}

		return env.ASSETS.fetch(request);
	},
};
