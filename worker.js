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

			return fetch("https://ap.byseansingh.com/api/event", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		if (url.pathname === "/u.js") {
			const res = await fetch(
				"https://au.withcapsule.dev/script.js",
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

			return fetch("https://au.withcapsule.dev/api/send", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		const response = await env.ASSETS.fetch(request);
		const headers = new Headers(response.headers);
		headers.set( "Content-Security-Policy",
			"default-src 'none'; " +
			"script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; " +
			"style-src 'self'; " +
			"connect-src 'self' https://send.withcapsule.dev; " +
			"img-src 'self' data:; " +
			"font-src 'self'; " +
			"manifest-src 'self'; " +
			"frame-ancestors 'none';"
		);
		headers.set( "X-Frame-Options", "DENY" );
		headers.set( "X-Content-Type-Options", "nosniff" );
		return new Response( response.body, { status: response.status, headers } );
	},
};
