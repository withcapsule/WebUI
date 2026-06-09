export async function onRequestPost(context) {
	return fetch("https://analytics.byseansingh.com/api/event", {
		method: "POST",
		headers: context.request.headers,
		body: context.request.body,
	});
}
