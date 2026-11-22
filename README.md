# PF Juegos

Índice de los juegos de la familia, pensado para la tele: **pf-juegos.vercel.app**

- La tele muestra los juegos, un QR y un código de 4 números.
- Cada celular que escanea el QR es un mando (hasta 4 por ahora: `MAX_PLAYERS` en `hub.js`).
- Se elige el juego con las flechas del control remoto + OK, con los números 1–9, o tocando dos veces el juego en el celular.
- Al lanzar un juego, la tele y los celulares que juegan van solos al juego con la misma sala. Si el juego es para menos jugadores, los demás quedan "mirando" y se reconectan solos cuando la tele vuelve al índice.
- Desde el juego, "🏠 Todos los juegos" (o que la tele vuelva atrás) devuelve a todos al índice.

## Sumar un juego
Agregá una entrada en `games.js` con `tv(code)`, `pad(code)`, `solo` y `players`. El juego tiene que aceptar `?hub=CODE` para usar ese código como sala y, en los celulares, volver a `https://pf-juegos.vercel.app/?j=CODE` cuando se corta la tele.

Sitio estático, sin build. Conexión celular ↔ tele por WebRTC (PeerJS).
