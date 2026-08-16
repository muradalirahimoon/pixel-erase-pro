# PixelErase Pro

A professional Vite starter for an AI-style image cleanup website.

## Features
- 10-second Three.js 3D intro
- Automatic background removal using `@imgly/background-removal`
- Transparent PNG preview/download
- OCR-powered exact-text search using Tesseract.js
- Simple text-area cleanup for flat/simple backgrounds
- Responsive dark premium UI

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Production build

```bash
npm run build
```

The production files are generated in `dist/`.

## Important production note

The background-removal model is downloaded in the browser and can be large. The first run may take time.

The text feature in this starter uses OCR to find matching text and a simple fill operation. It is NOT a full generative inpainting system. For professional object/text removal over complex backgrounds, connect the selected region to a real inpainting model/API or a self-hosted image-inpainting backend.

## Deploy

You can push this project to GitHub and deploy the repository to Vercel, Netlify, or Cloudflare Pages. Use:
- Build command: `npm run build`
- Output directory: `dist`
