# Cabeceras de seguridad y CSP del panel

Las cabeceras viven en `vercel.json` y solo aplican al panel servido desde Vercel.

## Capacitor / Android
Dentro de la app Android los assets se sirven localmente desde la WebView (`https://localhost`),
sin pasar por Vercel: ni la CSP ni el resto de cabeceras de `vercel.json` se aplican alli.
Para endurecer la WebView habria que poner una etiqueta `<meta http-equiv="Content-Security-Policy">`
en `public/index.html` (no hecho: cambiaria tambien el comportamiento de la web).

## Origenes permitidos en la CSP
- `script-src 'self'`: el build de CRA no tiene scripts inline ni `eval`. Si en el futuro hay
  code-splitting con runtime en linea, definir `INLINE_RUNTIME_CHUNK=false`.
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`: `unsafe-inline` por los estilos en linea de React/Tailwind; hoja de Google Fonts.
- `font-src 'self' data: https://fonts.gstatic.com`: ficheros de Inter/JetBrains Mono.
- `img-src 'self' data: blob: https:`: las imagenes de producto/servicio las pone el cliente (Cloudinary u otra URL https).
- `connect-src 'self' https://whatsapp-crm.ash-1.instapods.app`: la API. No hay websockets (socket.io-client no se importa).
  Si cambia `REACT_APP_API_URL` en Vercel, hay que actualizar este origen.
- `worker-src 'self'` / `manifest-src 'self'`: `sw.js` y `manifest.json`.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
