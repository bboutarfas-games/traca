import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos, barajar } from '../ui.jsx'

const SIMBOLOS = ['🔺', '🟦', '⭐', '🍀', '🔔', '💀']
const LARGO = 4
const ORDINAL = ['1.ª', '2.ª', '3.ª', '4.ª']

function Ranura({ simbolo, resaltada }) {
  return <span className={'ranura' + (resaltada ? ' resaltada' : '')}>{simbolo ?? ''}</span>
}

function Pantalla({ fase, datos, resumen, jugadores, yo }) {
  const marcado = yo?.getState('codigo') || []
  const miPosicion = datos.pistas?.[yo?.id]

  const pulsar = (i) => {
    if (fase !== 'teclado' || marcado.length >= LARGO) return
    myPlayer().setState('codigo', [...marcado, i])
  }
  const borrar = () => {
    if (fase !== 'teclado') return
    myPlayer().setState('codigo', [])
  }

  if (fase === 'pistas')
    return (
      <div className="orden">
        <p className="susurro">Tu trozo de la contraseña</p>
        <div className="tarjeta">
          <p className="instruccion">
            La <b>{ORDINAL[miPosicion]}</b> es
          </p>
          <span className="simbolote">{SIMBOLOS[datos.codigo[miPosicion]]}</span>
        </div>
        <p className="pista">Solo tú lo ves. Decidlo en voz alta.</p>
      </div>
    )

  if (fase === 'teclado')
    return (
      <>
        <p className="susurro">Marca la contraseña entera</p>
        <div className="ranuras">
          {Array.from({ length: LARGO }, (_, i) => (
            <Ranura key={i} simbolo={SIMBOLOS[marcado[i]]} resaltada={i === marcado.length} />
          ))}
        </div>
        <div className="teclado">
          {SIMBOLOS.map((s, i) => (
            <button key={i} className="tecla" onClick={() => pulsar(i)} disabled={marcado.length >= LARGO}>
              {s}
            </button>
          ))}
        </div>
        <button className="enlace" onClick={borrar}>Borrar</button>
        <p className="pista">Cada uno la marca en su pantalla. Puntúa quien la acierte.</p>
      </>
    )

  const acertaron = jugadores.filter((j) => (resumen?.acertaron || []).includes(j.id))
  return (
    <div className="resultado">
      <p className="susurro">La contraseña era</p>
      <div className="ranuras">
        {datos.codigo.map((c, i) => <Ranura key={i} simbolo={SIMBOLOS[c]} />)}
      </div>
      <p className={acertaron.length ? 'pillado' : 'escapado'}>
        {acertaron.length
          ? `La sacan ${acertaron.map((j) => perfil(j).nombre).join(', ')} (+2)`
          : 'No la sacó nadie'}
      </p>
      <div className="fichas">{acertaron.map((j) => <Ficha key={j.id} jugador={j} />)}</div>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'laContrasena',
  nombre: 'La contraseña',
  tipo: 'Todos contra el juego',
  claim: 'Cada uno tiene un trozo. Solo juntos sale entera.',
  minimo: 3,
  estadosJugador: ['codigo'],

  fases: () => [
    { id: 'pistas', ms: 8000 },
    { id: 'teclado', ms: 13000 },
    { id: 'resultado', ms: 7000 },
  ],

  preparar: ({ jugadores }) => {
    const codigo = Array.from({ length: LARGO }, () => Math.floor(Math.random() * SIMBOLOS.length))

    // Repartimos las cuatro posiciones. Con menos de cuatro jugadores alguien
    // repite; con más, varios comparten el mismo trozo. Siempre sale entera.
    const posiciones = barajar([0, 1, 2, 3])
    const pistas = {}
    jugadores.forEach((j, i) => {
      pistas[j.id] = posiciones[i % LARGO]
    })

    return { codigo, pistas }
  },

  resolver: ({ jugadores, datos }) => {
    const acertaron = jugadores.filter((j) => {
      const c = j.getState('codigo') || []
      return c.length === LARGO && c.every((v, i) => v === datos.codigo[i])
    })
    acertaron.forEach((j) => sumarPuntos(j, 2))
    return { acertaron: acertaron.map((j) => j.id) }
  },

  Pantalla,
}
