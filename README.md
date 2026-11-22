# PF Juegos

Índice de los juegos de la familia, pensado para la tele: **pf-juegos.vercel.app**

- La tele muestra los juegos, un QR y un código de 4 números.
- Cada celular que escanea el QR es un mando (hasta 4 por ahora: `MAX_PLAYERS` en `hub.js`).
- Se elige el juego con las flechas del control remoto + OK, con los números 1–9, o tocando dos veces el juego en el celular.
- Al lanzar un juego, la tele y los celulares que juegan van solos al juego con la misma sala. Si el juego es para menos jugadores, los demás quedan "mirando" y se reconectan solos cuando la tele vuelve al índice.
- Desde el juego, "🏠 Todos los juegos" (o que la tele vuelva atrás) devuelve a todos al índice.

## Sumar un juego
Agregá un `pf-juego.json` en la raíz del repo del juego (ver abajo). El juego tiene que aceptar `?hub=CODE` para usar ese código como sala y, en los celulares, volver a `https://pf-juegos.vercel.app/?j=CODE` cuando se corta la tele.

Sitio estático, sin build. Conexión celular ↔ tele por WebRTC (PeerJS).

## Juegos que se suman solos
El índice no tiene la lista de juegos escrita a mano: `api/games.js` revisa los repos de GitHub de `paviafernando` y muestra todos los que tienen un archivo **`pf-juego.json`** en la raíz (la lista se refresca cada ~5 minutos). `games.js` es solo un respaldo por si GitHub no responde.

Ejemplo de `pf-juego.json`:

```json
{
  "id": "piano", "name": "Piano mágico", "emoji": "🎹", "color": "#ff5fa2",
  "group": "Música", "order": 10,
  "desc": "Texto corto para la tarjeta", "tags": ["🎵 11 canciones"],
  "url": "https://piano-alpha-ruby.vercel.app",
  "players": { "min": 1, "max": 2 },
  "tv": "/?tv&hub={code}",
  "pad": "/?tele={code}&hub={code}",
  "solo": "/"
}
```

- `{code}` se reemplaza por el código de la sala.
- Sin `pad`: el juego se juega con el control remoto de la tele (los celulares quedan mirando).
- `entries`: varias tarjetas desde un mismo repo (cada una hereda y pisa lo que quiera), como el simulador.
- `"hidden": true` lo oculta mientras está en desarrollo.
- Opcional en Vercel: variable `GITHUB_TOKEN` (solo lectura) para incluir repos privados y no depender del límite de GitHub sin token.
