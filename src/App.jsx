import { useEffect, useState } from 'react'
import {
  useMultiplayerState,
  usePlayersList,
  useIsHost,
  myPlayer,
  getRoomCode,
} from 'playroomkit'
import { MINIJUEGOS } from './minijuegos/index.js'
import { Escenario, Fichas, Podio, alAzar, perfil } from './ui.jsx'
import { sonido } from './sonido.js'

// Una ronda ronda los 20-28s según la prueba, de ahí los minutos aproximados.
const DURACIONES = [
  { rondas: 3, nombre: 'Corta', aprox: '~1 min' },
  { rondas: 5, nombre: 'Normal', aprox: '~2 min' },
  { rondas: 8, nombre: 'Larga', aprox: '~3 min' },
]

export default function App() {
  const esHost = useIsHost()
  const jugadores = usePlayersList(true)

  const [etapa, setEtapa] = useMultiplayerState('etapa', 'lobby') // lobby | jugando | fin
  const [mjId, setMjId] = useMultiplayerState('mjId', '')
  const [datos, setDatos] = useMultiplayerState('datos', null)
  const [resumen, setResumen] = useMultiplayerState('resumen', null)
  const [faseIdx, setFaseIdx] = useMultiplayerState('faseIdx', 0)
  const [finFase, setFinFase] = useMultiplayerState('finFase', 0)
  const [ronda, setRonda] = useMultiplayerState('ronda', 0)
  const [totalRondas, setTotalRondas] = useMultiplayerState('totalRondas', 5)
  // Estado que cambia durante la fase (altura, marcadores…). Solo lo escribe el host.
  const [vivo, setVivo] = useMultiplayerState('vivo', null)

  const [silenciado, setSilenciado] = useState(sonido.silenciado)
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  // Un solo oyente para el clic de todos los botones.
  useEffect(() => {
    const al = (e) => e.target.closest?.('button') && sonido.pulsar()
    document.addEventListener('pointerdown', al)
    return () => document.removeEventListener('pointerdown', al)
  }, [])

  const yo = myPlayer()
  const mj = MINIJUEGOS.find((m) => m.id === mjId)
  // mjId y datos viajan en mensajes distintos: hasta que casan, no pintamos nada.
  const datosOk = datos?.mj === mjId ? datos : null
  const vivoOk = vivo?.mj === mjId ? vivo : null
  const fases = mj && datosOk ? mj.fases(datosOk) : []
  const fase = fases[faseIdx]?.id
  const conReloj = fases[faseIdx]?.reloj !== false
  const restante = Math.max(0, Math.ceil((finFase - ahora) / 1000))

  // Salir de verdad: Playroom vive en estado global, así que limpiamos el
  // código de sala del hash y recargamos.
  const salir = () => {
    try { myPlayer()?.leaveRoom() } catch { /* la sala ya no existe */ }
    window.location.hash = ''
    window.location.reload()
  }

  // Cada cambio de fase suena distinto, y la musiquilla solo en la fase que la pida.
  useEffect(() => {
    if (etapa !== 'jugando' || !fase) return
    if (mj?.musicaEn === fase) sonido.musicaOn()
    else sonido.musicaOff()

    if (fase === 'resultado') sonido.revelar()
    else if (mj?.musicaEn === fase) sonido.aviso()
    else sonido.cambio()
  }, [fase, faseIdx, mjId, etapa])

  useEffect(() => {
    if (etapa === 'fin') { sonido.musicaOff(); sonido.fanfarria() }
    if (etapa === 'lobby') sonido.musicaOff()
  }, [etapa])

  // Los tres últimos segundos hacen tic.
  useEffect(() => {
    if (etapa !== 'jugando' || !conReloj) return
    if (restante > 0 && restante <= 3) sonido.tic()
  }, [restante, conReloj, etapa])

  useEffect(() => () => sonido.musicaOff(), [])

  // Volver al lobby entre programas: reinicia el marcador y permite cambiar la
  // duración o esperar a que entre alguien más.
  const otroPrograma = () => {
    jugadores.forEach((j) => j.setState('puntos', 0))
    setRonda(0)
    setResumen(null)
    setVivo(null)
    setEtapa('lobby')
  }

  // --- Control de rondas: solo lo ejecuta el host ------------------------

  const abrirRonda = (n) => {
    // Elegimos entre los que admiten esta cantidad de jugadores, evitando
    // repetir el de la ronda anterior si hay alternativa.
    let jugables = MINIJUEGOS.filter((m) => jugadores.length >= m.minimo)
    if (!jugables.length) jugables = MINIJUEGOS
    const sinRepetir = jugables.filter((m) => m.id !== mjId)

    // ?prueba=<id> repite siempre la misma. Sirve para revisarla sin depender
    // del azar; no hace falta para jugar.
    const forzada = new URLSearchParams(window.location.search).get('prueba')
    const siguiente =
      MINIJUEGOS.find((m) => m.id === forzada) || alAzar(sinRepetir.length ? sinRepetir : jugables)
    const datosRonda = { ...siguiente.preparar({ jugadores }), mj: siguiente.id }

    // Limpiamos lo que dejó la ronda anterior, sea del minijuego que sea.
    MINIJUEGOS.forEach((m) =>
      m.estadosJugador.forEach((k) => jugadores.forEach((j) => j.setState(k, null))),
    )

    setMjId(siguiente.id)
    setDatos(datosRonda)
    setVivo(siguiente.inicial ? { ...siguiente.inicial, mj: siguiente.id } : null)
    setResumen(null)
    setFaseIdx(0)
    setRonda(n)
    setEtapa('jugando')
    setFinFase(Date.now() + siguiente.fases(datosRonda)[0].ms)
  }

  useEffect(() => {
    if (!esHost || etapa !== 'jugando' || !mj || !datosOk) return

    // Los minijuegos con estado continuo avanzan aquí, unas 10 veces por segundo.
    if (mj.tick && fase) mj.tick({ jugadores, datos: datosOk, vivo: vivoOk, setVivo, fase })

    if (ahora < finFase) return

    const sig = faseIdx + 1
    if (sig < fases.length) {
      // Un minijuego puede resolver algo al entrar en cada fase (rondas dentro
      // de la ronda). Si devuelve estado nuevo, se aplica antes de puntuar.
      const nuevo = mj.alEntrar?.({
        jugadores,
        datos: datosOk,
        vivo: vivoOk,
        fase: fases[sig].id,
        faseIdx: sig,
      })
      if (nuevo) setVivo({ ...nuevo, mj: mjId })

      if (fases[sig].id === 'resultado')
        setResumen(mj.resolver({ jugadores, datos: datosOk, vivo: nuevo || vivoOk }))
      setFaseIdx(sig)
      setFinFase(Date.now() + fases[sig].ms)
    } else if (ronda >= totalRondas) {
      setEtapa('fin')
    } else {
      abrirRonda(ronda + 1)
    }
  }, [ahora, esHost, etapa, faseIdx, finFase, mjId])

  // --- Pantallas ---------------------------------------------------------

  if (etapa === 'lobby')
    return (
      <Escenario>
        <p className="rotulo">Concurso</p>
        <h1 className="logo">TRACA</h1>
        <Fichas jugadores={jugadores} />
        <p className="cuenta">{jugadores.length} en el plató</p>

        <input
          className="campo nombre"
          defaultValue={perfil(yo).nombre}
          maxLength={14}
          aria-label="Tu nombre"
          placeholder="Tu nombre"
          onChange={(e) => myPlayer().setState('nombre', e.target.value.slice(0, 14))}
        />

        <div className="duracion">
          <p className="susurro">Duración</p>
          <div className="opciones">
            {DURACIONES.map((d) => (
              <button
                key={d.rondas}
                className={'opcion' + (totalRondas === d.rondas ? ' activa' : '')}
                onClick={() => esHost && setTotalRondas(d.rondas)}
                disabled={!esHost}
              >
                <b>{d.nombre}</b>
                <span>{d.rondas} rondas · {d.aprox}</span>
              </button>
            ))}
          </div>
          {!esHost && <p className="pista">Lo decide el presentador.</p>}
        </div>
        {esHost ? (
          <button className="boton" disabled={jugadores.length < 3} onClick={() => abrirRonda(1)}>
            {jugadores.length < 3 ? 'Hacen falta 3 jugadores' : 'Empezar programa'}
          </button>
        ) : (
          <p className="espera">Esperando al presentador…</p>
        )}
        <p className="sala">Código de sala: <b>{getRoomCode()}</b></p>
        <div className="pieLobby">
          <button className="enlace" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
            Copiar enlace de invitación
          </button>
          <button className="enlace" onClick={() => setSilenciado(sonido.alternarSilencio())}>
            {silenciado ? 'Activar sonido' : 'Silenciar'}
          </button>
          <button className="enlace" onClick={salir}>Salir</button>
        </div>
      </Escenario>
    )

  if (etapa === 'fin')
    return (
      <Escenario>
        <h1 className="logo">SE ACABÓ</h1>
        <Podio jugadores={jugadores} />
        {esHost ? (
          <button className="boton" onClick={otroPrograma}>Otro programa</button>
        ) : (
          <p className="espera">Esperando al presentador…</p>
        )}
        <button className="enlace" onClick={salir}>Salir</button>
      </Escenario>
    )

  if (!mj || !datosOk || !fase) return <Escenario><p className="espera">Preparando prueba…</p></Escenario>

  return (
    <Escenario>
      <header className="marcador">
        <span className="ronda">Ronda {ronda}/{totalRondas}</span>
        <span className="reloj">{conReloj ? restante : '···'}</span>
        <span className="puntos">{yo?.getState('puntos') || 0} pts</span>
        <button
          className="salirChico"
          onClick={() => setSilenciado(sonido.alternarSilencio())}
          title={silenciado ? 'Activar sonido' : 'Silenciar'}
        >
          {silenciado ? '🔇' : '🔊'}
        </button>
        <button className="salirChico" onClick={salir} title="Salir de la sala">✕</button>
      </header>
      <p className="tituloPrueba">{mj.nombre}</p>
      <mj.Pantalla
        fase={fase}
        datos={datosOk}
        vivo={vivoOk}
        resumen={resumen}
        jugadores={jugadores}
        yo={yo}
      />
    </Escenario>
  )
}
