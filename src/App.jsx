import { useEffect, useState } from 'react'
import {
  useMultiplayerState,
  usePlayersList,
  useIsHost,
  myPlayer,
  getRoomCode,
} from 'playroomkit'
import { MINIJUEGOS } from './minijuegos/index.js'
import { Escenario, Fichas, Podio, alAzar } from './ui.jsx'

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

  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 100)
    return () => clearInterval(t)
  }, [])

  const yo = myPlayer()
  const mj = MINIJUEGOS.find((m) => m.id === mjId)
  // mjId y datos viajan en mensajes distintos: hasta que casan, no pintamos nada.
  const datosOk = datos?.mj === mjId ? datos : null
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

  // --- Control de rondas: solo lo ejecuta el host ------------------------

  const abrirRonda = (n) => {
    // Elegimos entre los que admiten esta cantidad de jugadores, evitando
    // repetir el de la ronda anterior si hay alternativa.
    let jugables = MINIJUEGOS.filter((m) => jugadores.length >= m.minimo)
    if (!jugables.length) jugables = MINIJUEGOS
    const sinRepetir = jugables.filter((m) => m.id !== mjId)
    const siguiente = alAzar(sinRepetir.length ? sinRepetir : jugables)
    const datosRonda = { ...siguiente.preparar({ jugadores }), mj: siguiente.id }

    // Limpiamos lo que dejó la ronda anterior, sea del minijuego que sea.
    MINIJUEGOS.forEach((m) =>
      m.estadosJugador.forEach((k) => jugadores.forEach((j) => j.setState(k, null))),
    )

    setMjId(siguiente.id)
    setDatos(datosRonda)
    setResumen(null)
    setFaseIdx(0)
    setRonda(n)
    setEtapa('jugando')
    setFinFase(Date.now() + siguiente.fases(datosRonda)[0].ms)
  }

  useEffect(() => {
    if (!esHost || etapa !== 'jugando' || !mj || !datosOk) return
    if (ahora < finFase) return

    const sig = faseIdx + 1
    if (sig < fases.length) {
      if (fases[sig].id === 'resultado') setResumen(mj.resolver({ jugadores, datos: datosOk }))
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
        <h1 className="logo">EL PROGRAMA</h1>
        <Fichas jugadores={jugadores} />
        <p className="cuenta">{jugadores.length} en el plató</p>

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
          <button className="enlace" onClick={salir}>Salir</button>
        </div>
      </Escenario>
    )

  if (etapa === 'fin')
    return (
      <Escenario>
        <h1 className="logo">SE ACABÓ</h1>
        <Podio jugadores={jugadores} />
        {esHost && <button className="boton" onClick={() => abrirRonda(1)}>Otra vez</button>}
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
        <button className="salirChico" onClick={salir} title="Salir de la sala">✕</button>
      </header>
      <p className="tituloPrueba">{mj.nombre}</p>
      <mj.Pantalla fase={fase} datos={datosOk} resumen={resumen} jugadores={jugadores} yo={yo} />
    </Escenario>
  )
}
