// Lista de respaldo: solo se usa si /api/games no responde y no hay una lista guardada.
// Los juegos se suman solos: cada repo con un `pf-juego.json` en la raíz aparece en el índice.
window.PF_FALLBACK = [
  {
    "id": "piano",
    "name": "Piano mágico",
    "emoji": "🎹",
    "color": "#ff5fa2",
    "group": "Música",
    "order": 10,
    "desc": "Aprendé canciones con bloques que caen o en pentagrama. ¡A dos manos con dos celulares!",
    "tags": [
      "🎵 11 canciones",
      "👑 Estilo princesa"
    ],
    "url": "https://piano-alpha-ruby.vercel.app",
    "players": {
      "min": 1,
      "max": 2
    },
    "tv": "/?tv&hub={code}",
    "pad": "/?tele={code}&hub={code}",
    "solo": "/"
  },
  {
    "id": "sim",
    "group": "Simulador",
    "order": 20,
    "url": "https://simulador-livid-kappa.vercel.app",
    "players": {
      "min": 1,
      "max": 1
    },
    "tags": [
      "📱 Celular = volante",
      "🔊 Vibra"
    ],
    "pad": "/?c={code}&hub={code}",
    "solo": "/#solo",
    "entries": [
      {
        "id": "plane",
        "name": "Avión",
        "emoji": "✈️",
        "color": "#ff5a36",
        "desc": "Volá entre montañas y lagos, y pasá por los aros dorados.",
        "tv": "/?hub={code}&g=plane"
      },
      {
        "id": "world",
        "name": "Mundo real",
        "emoji": "🌎",
        "color": "#2f8fff",
        "desc": "Volá sobre ciudades reales en 3D.",
        "tv": "/?hub={code}&g=world"
      },
      {
        "id": "race",
        "name": "Carrera",
        "emoji": "🏎️",
        "color": "#18c97a",
        "desc": "3 vueltas contra la computadora, con nitro y derrape.",
        "tv": "/?hub={code}&g=race"
      },
      {
        "id": "owl",
        "name": "Lechuza",
        "emoji": "🦉",
        "color": "#8f6bff",
        "desc": "Vuelo nocturno sobre el bosque: atrapá los orbes mágicos.",
        "tv": "/?hub={code}&g=owl"
      },
      {
        "id": "coaster",
        "name": "Montaña rusa",
        "emoji": "🎢",
        "color": "#ffb020",
        "desc": "Caída de 60 m, rizo y curvas. Mové el celu para mirar.",
        "tv": "/?hub={code}&g=coaster"
      }
    ]
  },
  {
    "id": "cajitas",
    "name": "Cajitas",
    "emoji": "📦",
    "color": "#e9a23b",
    "group": "Ingenio",
    "order": 30,
    "desc": "Empujá las cajas hasta su lugar. 42 niveles, deshacer y ayuda.",
    "tags": [
      "🧩 42 niveles",
      "👑 Modo princesa",
      "🌙 Modo noche"
    ],
    "url": "https://cajitas-ten.vercel.app",
    "tv": "/?hub={code}",
    "solo": "/"
  }
];
