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
    preparar({ jugadores })       // datos de la ronda, fijos y sincronizados
    resolver({ jugadores, datos, vivo })  // reparte puntos, devuelve el resumen
    Pantalla({ fase, datos, vivo, ... })  // pinta cada fase

    inicial                       // opcional: estado que cambia durante la fase
    tick({ jugadores, vivo, setVivo, fase })   // opcional: lo llama el host ~10/s
    alEntrar({ jugadores, datos, vivo, fase }) // opcional: al empezar cada fase;
                                               // si devuelve algo, pasa a ser `vivo`

`datos` no cambia durante la ronda; `vivo` sí, y solo lo escribe el host. Los
minijuegos sin estado continuo no declaran `inicial` ni `tick`.

Añadir uno nuevo es escribir ese módulo y meterlo en `src/minijuegos/index.js`.

## Minijuegos

**La orden falsa** (traición) — todos reciben la misma orden menos uno, que sabe
que es el infiltrado. Se ve en tiempo real dónde pulsa cada uno. El infiltrado
decide entre cumplir su orden (+2) o disimular (+3 si no le pillan).

**Las sillas** (todos contra todos) — hay una silla menos que jugadores. Si te
adelantas a la señal, fuera. Si dos elegís la misma silla, fuera los dos.

**El ascensor** (todos contra el juego) — mantener pulsado entre todos para que
suba, pero el brazo se cansa: hay que turnarse para descansar sin que bajen de la
mitad los que sujetan. O llegáis todos, o no puntúa nadie.

**El foco** (uno contra el resto) — uno ilumina un pasillo cada asalto; los demás
eligen por cuál pasan, en secreto. Si te ilumina, no avanzas. Hay que cruzar dos
tramos en tres asaltos, así que puedes permitirte que te pillen una vez.

**La contraseña** (todos contra el juego) — la clave son cuatro símbolos y cada
jugador solo ve uno, en secreto. Hay que decirlos en voz alta, montarla entre todos
y marcarla cada uno en su pantalla. Puntúa quien la acierte.

**El último en pie** (todos contra todos) — todos eligen baldosa en secreto y se
hunde la que tenga más gente. Si cada uno va a la suya no se hunde nada, pero el
suelo se estrecha cada asalto (6, 4, 3 y 2 baldosas) hasta forzar el choque.

**El portero** (uno contra el resto) — el portero tapa 2 de las 5 zonas en secreto
y los demás chutan. Además, si dos chutan a la misma zona se estorban y fallan los
dos: hay que esquivar al portero y a los compañeros a la vez.

**El saboteador** (traición) — hay que juntar empujes para mover un armatoste, pero
nadie puede empujar los tres asaltos, así que descansar es normal. El saboteador
tiene un botón extra para frenar (−1) que solo ve él. Solo se muestra cuánto avanza
cada asalto, no quién hizo qué. Votación al final.

Ya están los ocho.

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
