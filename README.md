# Puerta al Cielo

Web estática con el mismo modelo que `letter`: se sirve por GitHub Pages y guarda
su estado compartido (logs, configuración, código de usuario) en `data.json` del
propio repo, a través de la API de GitHub. El token de GitHub se cifra
(PBKDF2 + AES-256-GCM) con la contraseña de admin y se incrusta en `index.html`;
el admin lo descifra en el navegador al iniciar sesión.

## Accesos

- **Admin** → contraseña `Qwerty1234!`
- **Usuario** → contraseña `locademanual` (editable por el admin en *Configuración*)

## Qué ve cada rol

- **Usuario**: unas coordenadas (con icono 📍 y enlace a Google Maps) y una cuenta
  atrás hasta la fecha/hora que fija el admin. Al llegar a cero, la cuenta se queda
  en `00:00:00:00`, las coordenadas siguen visibles y aparece un mensaje configurable.
- **Admin**: tres pestañas — *Vista previa* (lo que ve el usuario), *Logs* (accesos
  de usuario/admin e intentos fallidos, con IP y fingerprint) y *Configuración*
  (código de usuario, etiqueta, latitud/longitud, fecha objetivo, mensaje de cero y
  desactivar página).

## Puesta en marcha

1. Crea un repo en GitHub llamado **`puerta-al-cielo`** (owner `AndresRomero2001`).
   Si usas otro owner/nombre, cámbialo arriba en `setup.js`.
2. Genera los archivos con tu token de GitHub (un PAT con permiso de escritura
   sobre el repo):

   ```sh
   node setup.js <github-token>
   # o: GH_TOKEN=xxx node setup.js
   # o, si tienes gh CLI: node setup.js   (usa `gh auth token`)
   ```

   Esto crea/actualiza `index.html` (con el token cifrado) y `data.json`.
3. Sube el repo y activa Pages:

   ```sh
   git init && git add . && git commit -m "init" && git push
   ```

   Settings → Pages → *Deploy from branch* → `main`. Quedará en
   `https://andresromero2001.github.io/puerta-al-cielo/`.

> Para regenerar el `index.html` sin tocar `data.json`, vuelve a ejecutar
> `node setup.js <token>`. Para reescribir también `data.json` con los valores por
> defecto, añade `--force-data`.

## Archivos

- `index.template.html` — fuente de la web (con marcadores `__GITHUB_API__`,
  `__ADMIN_HASH__`, `__ENC_ADMIN_TOKEN__`).
- `setup.js` — genera `index.html` y `data.json` a partir de la plantilla.
- `index.html` / `data.json` — generados (se despliegan en Pages).
