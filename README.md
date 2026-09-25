# RSS to Custom RSS

A small Node.js/Express service that fetches the Fordham University Localist events RSS feed, reshapes each event into a custom RSS format, and serves it as XML. The custom format splits the event title and location apart and breaks the start date out into separate day, month, and weekday fields.

## How it works

1. A request comes in to `GET /localist/events/feed`.
2. The service fetches the source RSS feed (`RSS_URL`), unless a copy fetched within the last minute is already in memory.
3. Each `<item>` is transformed:
   - The title `"September 25: Presidential Inauguration Lecture at Lincoln Center"` becomes a `title` of `Presidential Inauguration Lecture` and a `location` of `Lincoln Center`. The date prefix before the first `:` is removed, and the location is the text after the **last** ` at `.
   - `pubDate` is converted to `start-date` (`25`), `start-month` (`September`), and `start-day` (`Friday`) in the `America/New_York` time zone.
4. If there is a `?category=` filter, only matching items are kept.
5. The result is returned as RSS 2.0 XML.

## Endpoint

### `GET /localist/events/feed`

Returns the transformed feed as `application/xml; charset=utf-8`.

| Query parameter | Description |
| --- | --- |
| `category` | Optional. Returns only items with a matching `<category>`. Matching is case-insensitive. Repeat the parameter to match any of several categories, e.g. `?category=Lecture&category=Arts`. |

**Each output `<item>` contains:** `start-date`, `start-month`, `start-day`, `title`, `location`, `description`, `link`, `media:content`, `geo:lat`, `geo:long`, `pubDate`, `dc:date`, `category`, `guid`.

**The channel contains:** `title`, `link` (set to `FEED_URL`), `description`, `language`, `lastBuildDate` (when the source feed was last fetched), and `query` (the category filter, if one was used).

**Response headers**

```
Content-Type: application/xml; charset=utf-8
Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400
ETag: W/"..."
```

**Errors:** if the source feed can't be fetched or isn't valid RSS, the service returns `500` with:

```json
{ "error": "Unable to generate event feed" }
```

Full error details are written to the server log only.

## Requirements

- Node.js **24 or later** (enforced via `engines` in `package.json`)
- npm

Runtime dependencies: `express` and `fast-xml-parser`. There are no dev dependencies.

## Configuration

All configuration comes from environment variables. The app checks them at startup and **refuses to start** if any are missing or invalid.

| Variable | Required | Description |
| --- | --- | --- |
| `RSS_URL` | Yes | URL of the source Localist RSS feed. Must be `http` or `https`. |
| `FEED_URL` | Yes | Public URL of this feed. Used as the channel `<link>`. Must be `http` or `https`. |
| `PORT` | No | Port to listen on. Defaults to `8000`. Must be an integer from 1 to 65535. Azure sets this automatically. |

For local development, create a `.env` file in the project root. It's git-ignored, so never commit it.

```
PORT=8000
RSS_URL=https://<localist-host>/<path-to-source-rss>
FEED_URL=https://<public-host>/localist/events/feed
```

## Running locally

```bash
npm ci
npm run dev
```

`npm run dev` loads `.env` and restarts on file changes. The feed is then available at `http://localhost:8000/localist/events/feed`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs with `--watch` and loads `.env`. For local development. |
| `npm start` | Runs `node server.js`. Does **not** load `.env`; it expects the environment variables to be set already. This is the production start command. |
| `npm test` | Runs the test suite with Node's built-in test runner. |

To run `npm start` locally with your `.env` file:

```bash
node --env-file=.env server.js
```

## Tests

```bash
npm test
```

The tests cover:
- text and category normalization
- empty feeds
- rejection of malformed or non-RSS responses
- the 5 MiB size limit on the source feed
- multibyte characters split across stream chunks
- startup validation of the environment variables

## Project structure

```
server.js                     Express app setup and startup
routes/Feed.js                Route: GET /events/feed (mounted at /localist)
controllers/index.js          Builds the output RSS XML and sends the response
services/index.js             Fetches (with caching) and transforms source items
utils/index.js                Source fetch/parse, in-memory cache, category filter
helpers/index.js              Title/date parsing and per-item transformation
helpers/xml-text.js           Extracts text from parsed XML values
helpers/config/env.js         Environment variable loading and validation
helpers/config/formatters.js  Date formatter (America/New_York)
test/feed.test.js             Tests
```

## Caching and reliability

There are two layers of caching.

**1. In-memory cache in the app.** Transformed items are kept for **1 minute** per instance. Requests that arrive together while the cache is refreshing share a single fetch of the source feed. The cache is lost when the app restarts, and each instance has its own copy.

**2. Cloudflare edge cache.** Driven by the `Cache-Control` header on successful responses:

| Setting | Meaning |
| --- | --- |
| `max-age=60` | Cloudflare caches the feed for 60 seconds. |
| `stale-while-revalidate=300` | For up to 5 minutes after that, Cloudflare serves the cached copy while it fetches a fresh one in the background. |
| `stale-if-error=86400` | If the app or the source feed is down, Cloudflare keeps serving the last good copy for up to 24 hours. |

Error responses carry no caching headers, and Cloudflare does not cache 5xx responses by default.

**Protections on the source fetch**
- 8-second timeout
- 5 MiB maximum response size, enforced while streaming
- XML validated before parsing
- Response must contain an RSS `<channel>`

## Deployment: Azure App Service

The app runs as a standard Node.js web app on **Azure App Service (Linux)**. No build step is needed.

1. **Runtime stack:** Node **24 LTS**.
2. **Startup command:** `npm start`
3. **App Settings** (Configuration → Environment variables):
   - `RSS_URL`: source Localist RSS URL
   - `FEED_URL`: public feed URL, e.g. `https://<public-host>/localist/events/feed`
   - Do **not** set `PORT`; App Service provides it.
   - If deploying source without `node_modules`, set `SCM_DO_BUILD_DURING_DEPLOYMENT=true` so dependencies are installed during deployment.
4. **General settings:**
   - **Always On:** enabled. This keeps the in-memory cache warm and avoids cold starts. It requires Basic tier or above.
   - **HTTPS Only:** enabled.
5. **Health check** (optional): the app has no dedicated health endpoint. If you enable Health check, use `/localist/events/feed`. The app answers health checks from its 1-minute cache, but a check can trigger a fetch of the source feed when that cache has expired, and a source outage will make the check fail.
6. **Access restrictions:** allow inbound traffic **only from Cloudflare IP ranges** (<https://www.cloudflare.com/ips/>), so nobody can reach the app directly and bypass the cache.
7. **Scaling:** the app is stateless apart from its per-instance 1-minute cache, so running more than one instance is safe.

**Verify after deploying**

```bash
curl -sI https://<public-host>/localist/events/feed
```

Expect `200`, `Content-Type: application/xml`, and the `Cache-Control` header shown above.

## Cloudflare configuration

1. **DNS:** point the public hostname at the App Service and set it to **Proxied** (orange cloud).
2. **SSL/TLS mode:** **Full (strict)**. App Service provides a valid certificate for `*.azurewebsites.net`. For a custom domain, add the domain and a certificate to App Service.
3. **Cache Rule (required).** By default Cloudflare only caches known static file extensions, and this path has none, so without this rule **nothing is cached**.
   - **When:** URI path starts with `/localist/events/feed`
   - **Then:** Eligible for cache
   - **Edge TTL:** use the cache-control header if present
   - **Cache key:** include the query string, so each `?category=` filter is cached separately. This is the default.
4. **Compression:** Cloudflare compresses `application/xml` for visitors automatically. The unfiltered feed is about 900 KB uncompressed.

## Handoff checklist

**Application**
- [ ] Code is on the `main` branch (merged from `optimization-cache`)
- [ ] `npm ci && npm test` passes

**Azure App Service**
- [ ] Linux web app created, runtime Node 24 LTS
- [ ] Startup command set to `npm start`
- [ ] `RSS_URL` and `FEED_URL` set in App Settings
- [ ] Always On enabled
- [ ] HTTPS Only enabled
- [ ] Access restricted to Cloudflare IP ranges
- [ ] (Optional) Health check set to `/localist/events/feed`

**Cloudflare**
- [ ] DNS record proxied
- [ ] SSL/TLS set to Full (strict)
- [ ] Cache Rule for `/localist/events/feed*` set to Eligible for cache and respecting origin headers
- [ ] After deploying, `cf-cache-status: HIT` appears on repeat requests

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| App exits at startup with `Missing required environment variable` | `RSS_URL` or `FEED_URL` is not set in App Settings. |
| `must be a valid URL` / `must use HTTP or HTTPS` at startup | An environment variable value is malformed. |
| `500 {"error":"Unable to generate event feed"}` | The source feed is down, slow (over 8 s), larger than 5 MiB, or not valid RSS. Check the App Service log stream for details. |
| `cf-cache-status: DYNAMIC` on every request | The Cloudflare Cache Rule is missing or doesn't match the path. |
| Feed lags a few minutes behind the source | Expected. The in-memory cache (1 min), edge cache (1 min), and background refresh (up to 5 min) add up to a delay of a few minutes. |
