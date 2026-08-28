import { useEffect, useState } from 'react'
import { myPlayer, usePlayersState } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos } from '../ui.jsx'

const META = 100
const SUBE = 0.85   // por tick, si aguanta suficiente gente
const BAJA = 1.15   // por tick, si no

// La fuerza se lleva en local: así el botón responde al instante.
const GASTO = 1.9   // por tick sujetando
const DESCANSO = 1.1 // por tick soltando
const MINIMO = 25   // hasta aquí no puedes volver a agarrar

function Ascensor({ altura, sujetando, total }) {
  const necesarios = Math.ceil(total / 2)
  const suficiente = sujetando >= necesarios
  return (
    <div className="hueco">
      <div className="cable" />
      <div className="cabina" style={{ bottom: `calc(${altura}% - ${altura * 0.36}px)` }}>
        <div className={'cuerda' + (suficiente ? '' : ' floja')} />
        🛗
      </div>
      <div className="meta">META</div>
    </div>
  )
}

function Pantalla({ fase, vivo, resumen, jugadores, yo }) {
  const [fuerza, setFuerza] = useState(100)
  const [agarrado, setAgarrado] = useState(false)
  const agarres = usePlayersState('sujetando')
  const sujetando = agarres.filter((a) => a.state).length
  const necesarios = Math.ceil(jugadores.length / 2)

  // Gasto y recuperación, en el cliente de cada uno.
  useEffect(() => {
    if (fase !== 'subida') return
    const t = setInterval(() => {
      setFuerza((f) => Math.max(0, Math.min(100, f + (agarrado ? -GASTO : DESCANSO))))
    }, 100)
    return () => clearInterval(t)
  }, [fase, agarrado])

  // Si se acaba la fuerza, se suelta solo. Aparte del cálculo: encadenar dos
  // setState dentro del mismo updater es lo que React no admite.
  useEffect(() => {
    if (fase !== 'subida' || !agarrado || fuerza > 0) return
    setAgarrado(false)
    myPlayer().setState('sujetando', false)
  }, [fase, agarrado, fuerza])

  // Al acabar la fase se suelta solo, para no dejar el estado colgado.
  useEffect(() => {
    if (fase === 'subida') return
    setAgarrado(false)
    myPlayer()?.setState('sujetando', false)
  }, [fase])

  const agarrar = (quiero) => {
    if (fase !== 'subida') return
    if (quiero && fuerza < MINIMO) return
    setAgarrado(quiero)
    myPlayer().setState('sujetando', quiero)
  }

  if (fase === 'aviso')
    return (
      <div className="orden">
        <p className="susurro">Todos a la vez o ninguno</p>
        <div className="tarjeta">
          <p className="instruccion">
            Mantened pulsado. Hacen falta <b>{necesarios} de {jugadores.length}</b>.
          </p>
        </div>
        <p className="pista">El brazo se cansa: turnaos.</p>
      </div>
    )

  if (fase === 'subida') {
    const flojo = fuerza < MINIMO && !agarrado
    return (
      <>
        <p className="susurro">
          Sujetan <b>{sujetando}</b> de {jugadores.length} · hacen falta {necesarios}
        </p>
        <Ascensor altura={vivo?.altura || 0} sujetando={sujetando} total={jugadores.length} />

        <button
          className={'agarre' + (agarrado ? ' activo' : '') + (flojo ? ' agotado' : '')}
          onPointerDown={() => agarrar(true)}
          onPointerUp={() => agarrar(false)}
          onPointerLeave={() => agarrado && agarrar(false)}
          disabled={flojo}
        >
          {flojo ? 'Sin fuerza' : agarrado ? 'AGUANTA' : 'SUJETAR'}
        </button>

        <div className="fuerza">
          <div className="barra" style={{ width: `${fuerza}%` }} />
        </div>
        <p className="pista">Suelta para recuperar fuerza. Pero no soltéis todos a la vez.</p>
      </>
    )
  }

  const llegaron = resumen?.llegaron
  return (
    <div className="resultado">
      <p className="susurro">El ascensor llegó al</p>
      <h2 className="revelado">{Math.round(resumen?.altura || 0)}%</h2>
      <p className={llegaron ? 'pillado' : 'escapado'}>
        {llegaron ? '¡Arriba! +2 para todos' : 'Se quedó a medias. Nadie puntúa.'}
      </p>
      <div className="fichas">
        {jugadores.map((j) => <Ficha key={j.id} jugador={j} />)}
      </div>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'elAscensor',
  nombre: 'El ascensor',
  tipo: 'Todos contra el juego',
  claim: 'O subís juntos, o no sube nadie.',
  minimo: 3,
  estadosJugador: ['sujetando'],
  inicial: { altura: 0 },

  fases: () => [
    { id: 'aviso', ms: 7500 },
    { id: 'subida', ms: 16000 },
    { id: 'resultado', ms: 7000 },
  ],

  preparar: () => ({ meta: META }),

  tick: ({ jugadores, vivo, setVivo, fase }) => {
    if (fase !== 'subida' || !vivo) return
    const sujetando = jugadores.filter((j) => j.getState('sujetando')).length
    const necesarios = Math.ceil(jugadores.length / 2)
    const delta = sujetando >= necesarios ? SUBE : -BAJA
    const altura = Math.max(0, Math.min(META, (vivo.altura || 0) + delta))
    if (altura !== vivo.altura) setVivo({ ...vivo, altura })
  },

  resolver: ({ jugadores, vivo }) => {
    const altura = vivo?.altura || 0
    const llegaron = altura >= META
    if (llegaron) jugadores.forEach((j) => sumarPuntos(j, 2))
    return { altura, llegaron }
  },

  Pantalla,
}
