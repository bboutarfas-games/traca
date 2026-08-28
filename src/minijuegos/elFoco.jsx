import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos, alAzar } from '../ui.jsx'

const PASILLOS = 4
const META = 2      // pasos para cruzar: puedes permitirte que te pillen una vez
const ASALTOS = 3

const corredoresDe = (jugadores, datos) => jugadores.filter((j) => j.id !== datos.vigilanteId)

function Pasillo({ n, elegido, iluminado, gente, onClick, disabled }) {
  return (
    <button
      className={
        'pasillo' + (elegido ? ' mio' : '') + (iluminado ? ' iluminado' : '') + (disabled ? ' quieto' : '')
      }
      onClick={onClick}
      disabled={disabled}
    >
      <span className="numero">{n + 1}</span>
      <div className="fichas">{gente.map((j) => <Ficha key={j.id} jugador={j} />)}</div>
    </button>
  )
}

function Progreso({ corredores, paso }) {
  return (
    <div className="progreso">
      {corredores.map((j) => (
        <div key={j.id} className="carrera">
          <Ficha jugador={j} />
          <div className="via">
            {Array.from({ length: META }, (_, i) => (
              <span key={i} className={'tramo' + ((paso?.[j.id] || 0) > i ? ' hecho' : '')} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Pantalla({ fase, datos, vivo, resumen, jugadores, yo }) {
  const soyVigilante = yo?.id === datos.vigilanteId
  const vigilante = jugadores.find((j) => j.id === datos.vigilanteId)
  const corredores = corredoresDe(jugadores, datos)
  const miPasillo = yo?.getState('pasillo')
  const ultima = vivo?.ultima

  const elegir = (n) => {
    if (fase !== 'asalto') return
    myPlayer().setState('pasillo', n)
  }

  if (fase === 'reparto')
    return (
      <div className="orden">
        <p className="susurro">El foco lo lleva</p>
        <div className="tarjeta">
          <Ficha jugador={vigilante} grande />
          <p className="instruccion">{perfil(vigilante).nombre}</p>
        </div>
        <p className={soyVigilante ? 'aviso' : 'pista'}>
          {soyVigilante
            ? '🔦 Ilumina un pasillo. A quien pilles, no avanza.'
            : `Cruza ${META} tramos sin que te ilumine.`}
        </p>
      </div>
    )

  if (fase === 'asalto')
    return (
      <>
        <p className="susurro">
          {soyVigilante ? '¿Dónde apuntas el foco?' : '¿Por qué pasillo pasas?'}
        </p>
        <div className="pasillos">
          {Array.from({ length: PASILLOS }, (_, n) => (
            <Pasillo
              key={n}
              n={n}
              elegido={miPasillo === n}
              gente={[]}
              onClick={() => elegir(n)}
            />
          ))}
        </div>
        <p className="pista">Nadie ve lo que eliges hasta que se enciende la luz.</p>
        <Progreso corredores={corredores} paso={vivo?.paso} />
      </>
    )

  if (fase === 'luz') {
    const pillados = jugadores.filter((j) => (ultima?.pillados || []).includes(j.id))
    return (
      <>
        <p className="susurro">
          {ultima?.luz == null ? 'El foco no apuntó a ningún sitio' : `El foco cae en el pasillo ${ultima.luz + 1}`}
        </p>
        <div className="pasillos">
          {Array.from({ length: PASILLOS }, (_, n) => (
            <Pasillo
              key={n}
              n={n}
              iluminado={ultima?.luz === n}
              gente={corredores.filter((j) => ultima?.donde?.[j.id] === n)}
              disabled
            />
          ))}
        </div>
        <p className={pillados.length ? 'escapado' : 'pillado'}>
          {pillados.length
            ? `Pillados: ${pillados.map((j) => perfil(j).nombre).join(', ')}`
            : 'No pilló a nadie'}
        </p>
        <Progreso corredores={corredores} paso={vivo?.paso} />
      </>
    )
  }

  const llegaron = jugadores.filter((j) => (resumen?.llegaron || []).includes(j.id))
  return (
    <div className="resultado">
      <p className="susurro">Cruzaron el pasillo</p>
      <h2 className="revelado">
        {llegaron.length ? llegaron.map((j) => perfil(j).nombre).join(', ') : 'Nadie'}
      </h2>
      <p className="pista">
        {perfil(vigilante).nombre} pilló a alguien en {resumen?.asaltosConCaptura || 0} de {ASALTOS} asaltos.
      </p>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'elFoco',
  nombre: 'El foco',
  tipo: 'Uno contra el resto',
  claim: 'Uno ilumina. Los demás cruzan a oscuras.',
  minimo: 3,
  estadosJugador: ['pasillo'],
  inicial: { paso: {}, ultima: null, asaltosConCaptura: 0 },

  fases: () => [
    { id: 'reparto', ms: 6000 },
    ...Array.from({ length: ASALTOS }, () => [
      { id: 'asalto', ms: 4200 },
      { id: 'luz', ms: 2800 },
    ]).flat(),
    { id: 'resultado', ms: 6500 },
  ],

  preparar: ({ jugadores }) => ({ vigilanteId: alAzar(jugadores).id }),

  // Cada vez que se enciende la luz se resuelve el asalto.
  alEntrar: ({ jugadores, datos, vivo, fase }) => {
    if (fase !== 'luz' || !vivo) return null

    const vigilante = jugadores.find((j) => j.id === datos.vigilanteId)
    const luz = vigilante?.getState('pasillo')
    const corredores = corredoresDe(jugadores, datos)

    const paso = { ...vivo.paso }
    const donde = {}
    const pillados = []

    corredores.forEach((j) => {
      const p = j.getState('pasillo')
      if (p == null) return // no eligió: no avanza
      donde[j.id] = p
      if (p === luz) pillados.push(j.id)
      else paso[j.id] = (paso[j.id] || 0) + 1
    })

    jugadores.forEach((j) => j.setState('pasillo', null))

    return {
      paso,
      ultima: { luz: luz ?? null, donde, pillados },
      asaltosConCaptura: vivo.asaltosConCaptura + (pillados.length ? 1 : 0),
    }
  },

  resolver: ({ jugadores, datos, vivo }) => {
    const corredores = corredoresDe(jugadores, datos)
    const llegaron = corredores.filter((j) => (vivo?.paso?.[j.id] || 0) >= META)
    llegaron.forEach((j) => sumarPuntos(j, 2))

    const vigilante = jugadores.find((j) => j.id === datos.vigilanteId)
    const capturas = vivo?.asaltosConCaptura || 0
    if (vigilante && capturas) sumarPuntos(vigilante, capturas)

    return { llegaron: llegaron.map((j) => j.id), asaltosConCaptura: capturas }
  },

  Pantalla,
}
