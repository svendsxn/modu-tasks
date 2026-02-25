# MODU Tasks - PDF Manager

Single-page internal tool for MODU employees:
- Merge PDF files in chronological numeric filename order (`1.pdf`, `2.pdf`, `10.pdf`, etc.).
- Optional lossless optimization pass after merge.
- Fully client-side in browser (no backend, no file storage on server).

## Files
- `index.html` - app shell
- `styles.css` - UI styling
- `app.js` - PDF merge and optimization logic

## Local Run
Use any static server:

```bash
cd modu-tasks
python3 -m http.server 8788
```

Open `http://localhost:8788`.

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

## Cloudflare Pages Deploy
1. In Cloudflare, go to `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git`.
2. Select `MODU-Tasks`.
3. Build settings:
   - Framework preset: `None`
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. Deploy.

No environment variables are required.

## Privacy/Storage
- Files are processed in the browser memory only.
- No upload endpoint is used.
- No persistence layer is configured.
