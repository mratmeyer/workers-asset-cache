# workers-asset-cache

CloudFlare Workers script to proxy static content from external sources like S3 or Google Cloud Storage and cache them on Workers KV.

See my blog post [here](https://maxratmeyer.com/blog/caching-images-on-the-edge-with-s3-and-workers-kv/)

Use Workers environmental variable SERVICE as URL and update wrangler.toml with the correct CloudFlare account and zone IDs and route.

Example:
SERVICE | https://storage.googleapis.com/myBucket
