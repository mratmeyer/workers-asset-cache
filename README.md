# workers-asset-cache

Cloudflare Workers script to proxy and cache static content from external sources on Workers KV.

For more information on the rationale and setup, see my blog post [here](https://maxratmeyer.com/blog/caching-images-on-the-edge-with-s3-and-workers-kv/).

Use Workers environmental variable SERVICE as URL and update wrangler.toml with the correct CloudFlare account and zone IDs and route.

Example:
SERVICE | https://storage.googleapis.com/myBucket
