# MODU Tasks - PDF Manager

Single-page internal tool for MODU employees:
- Merge PDF files in chronological numeric filename order (`1.pdf`, `2.pdf`, `10.pdf`, etc.).
- Optional lossless optimization pass after merge.
- Fully client-side in browser (no backend, no file storage on server).
- Optional stateless API for machine-readable integration (Cloudflare Worker).

## Files
- `public/index.html` - app shell
- `public/styles.css` - UI styling
- `public/app.js` - browser merge and optimization logic
- `src/worker.js` - Cloudflare Worker API (`/api/merge`, `/api/optimize`)
- `wrangler.toml` - Worker config
- `package.json` - API dependencies and scripts

## Local Run
Use any static server:

```bash
cd modu-tasks
python3 -m http.server 8788 -d public
```

Open `http://localhost:8788`.

## API (Machine Readable)
This repo now includes a stateless Cloudflare Worker API and serves the frontend from the same Worker domain.

### Endpoints
- `GET /` (frontend)
- `GET /health`
- `GET /openapi.json`
- `POST /api/merge`
- `POST /api/optimize`

### Run API locally
```bash
cd /Users/gustavsvendsen/modu-tasks
npm install
npm run dev:api
```

### Deploy frontend + API to Cloudflare Worker
```bash
cd /Users/gustavsvendsen/modu-tasks
npm run deploy:api
```

### Example: merge
```bash
curl -X POST "https://<your-worker>.workers.dev/api/merge" \
  -F "files=@1.pdf" \
  -F "files=@2.pdf" \
  -F "files=@10.pdf" \
  -F "sort=numeric" \
  -F "optimize=true" \
  --output merged.pdf
```

### Example: optimize
```bash
curl -X POST "https://<your-worker>.workers.dev/api/optimize" \
  -F "file=@merged.pdf" \
  --output merged_optimized.pdf
```

## GitHub Setup
Create repo name: `MODU-Tasks` (display title can still be "MODU Tasks").

```bash
cd /Users/gustavsvendsen/modu-tasks
git init
git add .
git commit -m "Add MODU PDF Manager (client-side merge + optimize)"
git branch -M main
git remote add origin git@github.com:<your-org-or-user>/MODU-Tasks.git
git push -u origin main
```

No environment variables are required.

## Privacy/Storage
- Files are processed in the browser memory only.
- No upload endpoint is used.
- No persistence layer is configured.
