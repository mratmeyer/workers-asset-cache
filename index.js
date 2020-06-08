// Set headers here that you want to remove from the source
let extraHeaders = [
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
	let url = SERVICE + path
	
	// Get local CloudFlare cache and check if it's been cached before
	let cache = caches.default;
	let response = await cache.match(url);

	if (response){
		// Content has been cached. Get the file and return it
		let headers = new Headers(response.headers);

		headers.set('x-cache-level', "node");

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: headers
		});
	}
	
	// Not in cache, attempt to get the file from Workers KV
	let { value, metadata } = await ASSETS.getWithMetadata(url, "stream");

	if (metadata !== null) {
		// File exists in Workers KV! Get the file, add the usual Response headers, and return it
		let headers = new Headers();

		headers.set("x-cache-level", "kv");
		headers.set("accept-ranges", metadata["accept-ranges"])
		headers.set("content-type", metadata["content-type"])
		headers.set("content-length", metadata["content-length"])
		headers.set("Cache-Control", "public, max-age=360000");

		response = new Response(value, {
			status: 200,
			statusText: "OK",
			headers: headers
		})

		// Cache it locally while we're at it
		event.waitUntil(cache.put(url, response.clone()));

		return response;
	}

	// Response hasn't been cached in the node or on Workers KV, fetch it and set the headers.
	response = await fetch(url);

	let newHeaders = new Headers(response.headers);
	
	// If a file exists, set the cache in the browser to a month, if not, set it to 5 min
	if(response.status === 200){
		newHeaders.set('Cache-Control', "public, max-age=2628000");
	} else {
		newHeaders.set('Cache-Control', 'public, max-age=300');
	}

	// Remove the extra headers defined above
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
		// If the file exists, then put it in the CloudFlare cache
		event.waitUntil(cache.put(url, response.clone()));

		let headers = {}

		//Convert the headers to JSON
		for (let [key, value] of response.headers) {
			headers[key] = value;
		}

		// Also load the file into Workers KV
		await ASSETS.put(url, response.clone().body, { metadata: headers })
	}
	
	return response;
}