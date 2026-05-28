# Webinar GPE - Telegram Web App (GitHub Pages)

Borang pendaftaran Webinar yang dihost di **GitHub Pages** supaya Telegram `initData` berfungsi (tidak melalui iframe GAS HtmlService).

Backend: Google Apps Script (`GAS_EXEC_URL` dalam `config.js`).

## Setup (5 langkah)

### 1. Edit config.js

```javascript
GAS_EXEC_URL: "https://script.google.com/macros/s/AKfycb.../exec"
```

Guna URL **/exec** dari Deploy → Manage deployments (bukan /dev).

### 2. Push ke GitHub

- Cipta repo baru (contoh `gpe-webinar`)
- Upload semua fail dalam folder ini ke **root** repo
- Settings → Pages → Source: branch `main`, folder `/ (root)`

### 3. Dapatkan URL GitHub Pages

Contoh: `https://username.github.io/gpe-webinar/`

### 4. Apps Script

- Copy `WebinarApi.gs` ke projek Apps Script
- Patch `doGet` / `doPost` (rujuk `PATCH_doGet_doPost.gs`)
- Script Properties: `WEBINAR_PUBLIC_URL` = URL GitHub Pages
- Run `setupWebinarMenuButton()` — Menu Button mesti point ke GitHub URL

### 5. Test

- Force-close Telegram
- Buka bot → Menu Button "Daftar Webinar"
- Bar atas patut papar `@username` anda
- Submit borang penuh

## Debug

Tambah `?debug=1` pada URL GitHub Pages untuk papar panel diagnostic.

## Fail

| Fail | Fungsi |
|------|--------|
| index.html | Borang |
| styles.css | Tema neon |
| config.js | URL GAS API |
| app.js | Telegram SDK + JSONP + form POST |
