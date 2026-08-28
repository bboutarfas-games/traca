import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos, alAzar } from '../ui.jsx'

const ZONAS = 5
const CUBRE = 2   // zonas que tapa el portero
const TANDAS = 2

const tiradoresDe = (jugadores, datos) => jugadores.filter((j) => j.id !== datos.porteroId)

function Zona({ n, elegida, tapada, choque, gente, onClick, disabled }) {
  const clase =
    'zona' +
    (elegida ? ' mia' : '') +
    (tapada ? ' tapada' : '') +
    (choque ? ' choque' : '') +
    (disabled ? ' quieta' : '')
  return (
    <button className={clase} onClick={onClick} disabled={disabled}>
      <span className="numero">{tapada ? '🧤' : choque ? '💥' : n + 1}</span>
      <div className="fichas">{gente.map((j) => <Ficha key={j.id} jugador={j} />)}</div>
    </button>
  )
}

function Pantalla({ fase, datos, vivo, resumen, jugadores, yo }) {
  const soyPortero = yo?.id === datos.porteroId
  const portero = jugadores.find((j) => j.id === datos.porteroId)
  const tiradores = tiradoresDe(jugadores, datos)
  const mias = yo?.getState('zonas') || []
  const ultima = vivo?.ultima

  const marcar = (n) => {
    if (fase !== 'tanda') return
    if (soyPortero) {
      const ya = mias.includes(n)
      const nuevas = ya ? mias.filter((z) => z !== n) : [...mias, n].slice(-CUBRE)
      myPlayer().setState('zonas', nuevas)
    } else {
      myPlayer().setState('zonas', [n])
    }
  }

  if (fase === 'reparto')
    return (
      <div className="orden">
        <p className="susurro">Bajo palos</p>
        <div className="tarjeta">
          <Ficha jugador={portero} grande />
          <p className="instruccion">{perfil(portero).nombre}</p>
        </div>
        <p className={soyPortero ? 'aviso' : 'pista'}>
          {soyPortero
            ? `🧤 Tapas ${CUBRE} de las ${ZONAS} zonas.`
            : 'Chuta a una zona. Si dos coincidís, falláis los dos.'}
        </p>
      </div>
    )

  if (fase === 'tanda')
    return (
      <>
        <p className="susurro">
          {soyPortero
            ? <>Tapa <b>{CUBRE}</b> zonas ({mias.length}/{CUBRE})</>
            : <>Tanda {(vivo?.tanda || 0) + 1} de {TANDAS} · ¿dónde chutas?</>}
        </p>
        <div className="porteria">
          {Array.from({ length: ZONAS }, (_, n) => (
            <Zona key={n} n={n} elegida={mias.includes(n)} gente={[]} onClick={() => marcar(n)} />
          ))}
        </div>
        <p className="pista">
          {soyPortero
            ? 'Nadie ve dónde te tiras.'
            : 'Tampoco ves dónde chutan los demás. Ese es el problema.'}
        </p>
        <Marcador goles={vivo?.goles} paradas={vivo?.paradas} choques={vivo?.choques} />
      </>
    )

  if (fase === 'remate') {
    const golean = jugadores.filter((j) => (ultima?.goles || []).includes(j.id))
    return (
      <>
        <p className="susurro">{golean.length ? '¡Gol!' : 'Sin goles'}</p>
        <div className="porteria">
          {Array.from({ length: ZONAS }, (_, n) => (
            <Zona
              key={n}
              n={n}
              tapada={(ultima?.tapadas || []).includes(n)}
              choque={(ultima?.choques || []).includes(n)}
              gente={tiradores.filter((j) => ultima?.donde?.[j.id] === n)}
              disabled
            />
          ))}
        </div>
        <p className={golean.length ? 'pillado' : 'escapado'}>
          {golean.length
            ? `Marcan ${golean.map((j) => perfil(j).nombre).join(', ')}`
            : 'Lo para todo o se estorban entre ellos'}
        </p>
        <Marcador goles={vivo?.goles} paradas={vivo?.paradas} choques={vivo?.choques} />
      </>
    )
  }

  return (
    <div className="resultado">
      <p className="susurro">Acaba la tanda</p>
      <h2 className="revelado">
        {resumen?.paradas} parada{resumen?.paradas === 1 ? '' : 's'}
      </h2>
      <p className="pista">
        {perfil(portero).nombre} se lleva +{resumen?.paradas || 0}. Los goles valen +2.
      </p>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

function Marcador({ goles = 0, paradas = 0, choques = 0 }) {
  return (
    <p className="pista">
      Goles {goles} · paradas {paradas} · estorbos {choques}
    </p>
  )
}

export default {
  id: 'elPortero',
  nombre: 'El portero',
  tipo: 'Uno contra el resto',
  claim: 'Uno para. Los demás también se estorban entre ellos.',
  minimo: 3,
  estadosJugador: ['zonas'],
  inicial: { tanda: 0, goles: 0, paradas: 0, choques: 0, ultima: null, golesPor: {} },

  fases: () => [
    { id: 'reparto', ms: 6000 },
    ...Array.from({ length: TANDAS }, () => [
      { id: 'tanda', ms: 5000 },
      { id: 'remate', ms: 3200 },
    ]).flat(),
    { id: 'resultado', ms: 6500 },
  ],

  preparar: ({ jugadores }) => ({ porteroId: alAzar(jugadores).id }),

  alEntrar: ({ jugadores, datos, vivo, fase }) => {
    if (fase !== 'remate' || !vivo) return null

    const portero = jugadores.find((j) => j.id === datos.porteroId)
    let tapadas = portero?.getState('zonas') || []
    // Si no se coloca a tiempo, el portero cubre al azar: no puede salir gratis.
    while (tapadas.length < CUBRE) {
      const n = Math.floor(Math.random() * ZONAS)
      if (!tapadas.includes(n)) tapadas = [...tapadas, n]
    }

    const tiradores = tiradoresDe(jugadores, datos)
    const donde = {}
    const ocupacion = {}
    tiradores.forEach((j) => {
      const z = (j.getState('zonas') || [])[0]
      if (z == null) return
      donde[j.id] = z
      ;(ocupacion[z] ||= []).push(j.id)
    })

    const choques = Object.keys(ocupacion).filter((z) => ocupacion[z].length > 1).map(Number)
    const goles = []
    let paradas = 0
    Object.entries(ocupacion).forEach(([z, ids]) => {
      const zona = Number(z)
      if (tapadas.includes(zona)) paradas += ids.length
      else if (ids.length > 1) return // se estorban
      else goles.push(ids[0])
    })

    const golesPor = { ...vivo.golesPor }
    goles.forEach((id) => { golesPor[id] = (golesPor[id] || 0) + 1 })

    jugadores.forEach((j) => j.setState('zonas', null))

    return {
      tanda: vivo.tanda + 1,
      goles: vivo.goles + goles.length,
      paradas: vivo.paradas + paradas,
      choques: vivo.choques + choques.length,
      golesPor,
      ultima: { tapadas, donde, goles, choques },
    }
  },

  resolver: ({ jugadores, datos, vivo }) => {
    const golesPor = vivo?.golesPor || {}
    jugadores.forEach((j) => {
      const g = golesPor[j.id] || 0
      if (g) sumarPuntos(j, g * 2)
    })
    const portero = jugadores.find((j) => j.id === datos.porteroId)
    const paradas = vivo?.paradas || 0
    if (portero && paradas) sumarPuntos(portero, paradas)
    return { paradas, goles: vivo?.goles || 0 }
  },

  Pantalla,
}
