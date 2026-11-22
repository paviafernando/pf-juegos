// Catálogo de juegos del índice.
// Para sumar un juego: agregá una entrada acá. El hub arma solo la tarjeta, el QR y los mandos.
//   tv(code)   → URL que abre la tele (el juego usa `code` para su sala, así los celulares lo encuentran)
//   pad(code)  → URL a la que van los celulares que juegan
//   solo       → URL para jugar en un solo dispositivo (celular/compu sin tele)
//   players    → mínimo y máximo de mandos que usa ese juego
(function () {
  const SIM = 'https://simulador-livid-kappa.vercel.app';
  const PIANO = 'https://piano-alpha-ruby.vercel.app';

  const sim = (id, name, emoji, color, desc) => ({
    id: 'sim-' + id, name, emoji, color, desc, group: 'Simulador',
    players: { min: 1, max: 1 },
    tags: ['📱 Celular = volante', '🔊 Vibra'],
    tv: (c) => `${SIM}/?hub=${c}&g=${id}`,
    pad: (c) => `${SIM}/?c=${c}&hub=${c}`,
    solo: `${SIM}/#solo`,
  });

  window.PF_GAMES = [
    {
      id: 'piano', name: 'Piano mágico', emoji: '🎹', color: '#ff5fa2', group: 'Música',
      desc: 'Aprendé canciones con bloques que caen o en pentagrama. ¡A dos manos con dos celulares!',
      players: { min: 1, max: 2 },
      tags: ['🎵 11 canciones', '👑 Estilo princesa'],
      tv: (c) => `${PIANO}/?tv&hub=${c}`,
      pad: (c) => `${PIANO}/?tele=${c}&hub=${c}`,
      solo: `${PIANO}/`,
    },
    sim('plane', 'Avión', '✈️', '#ff5a36', 'Volá entre montañas y lagos, y pasá por los 25 aros dorados.'),
    sim('race', 'Carrera', '🏎️', '#18c97a', '3 vueltas contra 5 autos, con nitro y derrape.'),
    sim('owl', 'Lechuza', '🦉', '#8f6bff', 'Vuelo nocturno sobre el bosque: atrapá 40 orbes mágicos.'),
    sim('coaster', 'Montaña rusa', '🎢', '#ffb020', 'Caída de 60 m, rizo y curvas. Mové el celu para mirar.'),
  ];
})();
