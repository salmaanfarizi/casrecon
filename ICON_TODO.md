# PWA Icon TODO

## Current Status
The app currently uses an emoji-based SVG favicon (💰) as a temporary solution.

## To Add a Proper Icon

1. Create a 192x192 PNG icon for your app
2. Save it as `icon-192.png` in the root directory
3. Optionally create additional sizes: 512x512, 384x384, 256x256, 128x128, 96x96
4. Update `manifest.json`:

```json
{
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

5. Update `index.html` link tag:
```html
<link rel="icon" type="image/png" href="icon-192.png">
```

## Quick Icon Creation Tools

- **Favicon Generator**: https://favicon.io/
- **PWA Icon Generator**: https://www.pwabuilder.com/imageGenerator
- **Canva**: Create custom icons with your brand colors (#667eea, #764ba2)
- **Figma**: Design custom icons

## Recommended Icon Design

- Use cash/money related symbols
- Match app color scheme (purple gradient: #667eea → #764ba2)
- Keep it simple and recognizable at small sizes
- Ensure it works on both light and dark backgrounds
