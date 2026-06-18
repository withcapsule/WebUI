export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/cdn/d") {
			return new Response(
				JSON.stringify(
					{
						cf_connecting_ip: request.headers.get("CF-Connecting-IP"),
						x_forwarded_for: request.headers.get("X-Forwarded-For"),
						cf_ipcountry: request.headers.get("CF-IPCountry"),
						cf: {
							country: request.cf?.country,
							region: request.cf?.region,
							city: request.cf?.city,
						},
					},
					null,
					2,
				),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-store",
					},
				},
			);
		}

		if (url.pathname === "/u.js") {
			const res = await fetch(
				"https://analytics2.byseansingh.com/script.js",
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

			return fetch("https://analytics2.byseansingh.com/api/send", {
				method: request.method,
				headers,
				body: request.body,
			});
		}

		return env.ASSETS.fetch(request);
	},
};
