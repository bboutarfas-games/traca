# Traca

Party game de minijuegos cortos. Una traca: una prueba detrás de otra, sin respirar. 3-8 jugadores, cada uno en su propia pantalla.
Web, sin backend: el multijugador lo pone Playroom Kit.

## Cómo está montado

`src/App.jsx` es el motor: lobby, rondas, reloj, puntuación y podio. No sabe nada
de ningún minijuego en concreto.

Cada minijuego es un módulo en `src/minijuegos/` que exporta:

    id, nombre, tipo, minimo      // ficha
    estadosJugador                // claves que el motor limpia entre rondas
    fases(datos)                  // [{ id, ms, reloj? }]
    preparar({ jugadores })       // datos de la ronda, sincronizados
    resolver({ jugadores, datos })// reparte puntos, devuelve el resumen
    Pantalla({ fase, datos, ... })// pinta cada fase

Añadir uno nuevo es escribir ese módulo y meterlo en `src/minijuegos/index.js`.

## Minijuegos

**La orden falsa** (traición) — todos reciben la misma orden menos uno, que sabe
que es el infiltrado. Se ve en tiempo real dónde pulsa cada uno. El infiltrado
decide entre cumplir su orden (+2) o disimular (+3 si no le pillan).

**Las sillas** (todos contra todos) — hay una silla menos que jugadores. Si te
adelantas a la señal, fuera. Si dos elegís la misma silla, fuera los dos.

Faltan seis, listados en `PENDIENTES`.

## Correr

    npm install
    npm run dev

Se abre la portada. **Crear partida** monta una sala y te da un código; **Unirse**
entra con el código de otro; **Salir** vuelve a la portada y limpia la URL.

En el lobby, el anfitrión elige la duración: Corta (3 rondas), Normal (5) o Larga (8).

Entramos con `skipLobby: true`, así que la pantalla propia de Playroom (elegir
nombre, color y pulsar Launch) no aparece: los nombres y colores se asignan solos
y se cae directo en el lobby del juego.

Playroom tampoco distingue entre unirse y crear: con un código inexistente montaría
una sala nueva. `Root.jsx` lo detecta (acabas de anfitrión y solo en la sala) y te
devuelve a la portada con un aviso.

Para probarlo solo, abre la portada en varias ventanas de incógnito y une dos con
el código de la primera. Mínimo 3 jugadores.

## Estado

Prototipo. Sin sonido y sin persistencia.
Playroom va en modo desarrollo: para publicar hace falta un `gameId` de
joinplayroom.com. Trae soporte de Discord de fábrica.
