// Extra headers you want to remove from the source. Ex: Amazon S3 tags
const extraHeaders = [
	"etag",
	"last-modified",
  	"x-amz-id-2",
  	"x-amz-request-id",
]

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
	const path = new URL(event.request.url).pathname;
	const url = SERVICE + path
	
	// First, get PoP CloudFlare cache and check if the file been cached before.
	let cache = caches.default;
	let response = await cache.match(url);

	if (response) {
		// Response has been cached. Get the file and return it
		let headers = new Headers(response.headers);

		headers.set('x-cache-level', "node");

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: headers
		});
	}
	
	// Not in PoP cache. Attempt to get the file from Workers KV.
	let { value, metadata } = await ASSETS.getWithMetadata(url, "stream");

	if (metadata !== null) {
		// File exists in Workers KV! Get the file, add the usual Response headers, and return it.
		let headers = new Headers();

		headers.set("x-cache-level", "kv");
		headers.set("accept-ranges", metadata["accept-ranges"])
		headers.set("content-type", metadata["content-type"])
		headers.set("content-length", metadata["content-length"])
		headers.set("cache-control", metadata["cache-control"]);

		response = new Response(value, {
			status: 200,
			statusText: "OK",
			headers: headers
		})

		// Cache it at the PoP while we're at it.
		event.waitUntil(cache.put(url, response.clone()));

		return response;
	}

	// Response hasn't been cached at the PoP or on Workers KV. Fetch it and set the headers.
	response = await fetch(url);

	let newHeaders = new Headers(response.headers);
	
	// If file exists, set the cache in the browser to a month, if not, set it to none.
	if(response.status === 200){
		newHeaders.set('cache-control', "public, max-age=2628000");
	} else {
		newHeaders.set('cache-control', 'no-store');
	}

	// Remove the extra headers as defined above.
	extraHeaders.forEach(header => {
		newHeaders.delete(header);
	});

	newHeaders.set("x-cache-level", "origin");

	response = new Response(response.body , {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	})
	
	if(response.status === 200){
		// If the file exists, then put it in the PoP cache.
		event.waitUntil(cache.put(url, response.clone()));

		let headers = {}

		// Convert the headers to JSON so we can store them.
		for (let [key, value] of response.headers) {
			headers[key] = value;
		}

		// Also load the file into Workers KV.
		await ASSETS.put(url, response.clone().body, { metadata: headers })
	}
	
	return response;
}