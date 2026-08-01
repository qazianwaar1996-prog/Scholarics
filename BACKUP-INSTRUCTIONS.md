# Study Metrics — Backup Instructions
**Version 1.0**

---

## What to Back Up

| Asset | Frequency | Where |
|---|---|---|
| Full site files | Before every deploy | Local + cloud |
| Google Analytics data | Monthly export | GA4 → Reports → Export |
| Formspree submissions | Monthly | formspree.io → Submissions → Export CSV |
| Search Console data | Monthly | GSC → Performance → Export |

---

## Full Site Backup (Pre-Deploy)

Before every deploy, create a timestamped ZIP:

```bash
# macOS / Linux
cd ~/projects
zip -r study-metrics-backup-$(date +%Y%m%d).zip study-metrics-v1/ \
  --exclude "*.DS_Store" --exclude "__MACOSX/*"

# Windows (PowerShell)
Compress-Archive -Path study-metrics-v1 `
  -DestinationPath "study-metrics-backup-$(Get-Date -Format yyyyMMdd).zip"
```

Store backups in at least two locations:
- Local drive
- Cloud storage (Google Drive, Dropbox, or S3)

Keep the last **3 versions** minimum.

---

## Git Version Control (Recommended)

If you aren't already using Git, initialise a repo:

```bash
cd study-metrics-v1
git init
git add .
git commit -m "v1.0 — initial production release"
git remote add origin https://github.com/yourname/study-metrics.git
git push -u origin main
```

Before every change:
```bash
git add -A
git commit -m "describe what changed"
git push
```

To roll back to a previous version:
```bash
git log --oneline          # find the commit hash
git checkout <hash> -- .   # restore all files to that state
```

---

## Server Backup (Apache/VPS)

If you control the server, automate backups with cron:

```bash
# Add to crontab (crontab -e)
# Backs up at 2 AM every Sunday
0 2 * * 0 zip -r /backups/studymetrics-$(date +\%Y\%m\%d).zip /var/www/html/studymetrics/
# Delete backups older than 30 days
0 3 * * 0 find /backups -name "studymetrics-*.zip" -mtime +30 -delete
```

---

## Netlify / Cloudflare Pages Backup

These platforms keep deploy history automatically.

**Netlify:** Dashboard → Deploys → any past deploy → Download files  
**Cloudflare Pages:** Dashboard → Deployments → any past deployment (view files)

Still keep a local copy — platform accounts can be locked or suspended.

---

## Restore Procedure

1. Download your most recent backup ZIP
2. Extract to a local folder
3. Verify the files look correct
4. Re-upload via your deploy method (rsync, Netlify CLI, FTP)
5. Test the live site immediately after restore

