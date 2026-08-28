import { myPlayer, usePlayersState } from 'playroomkit'
import { Fichas, Podio, perfil, sumarPuntos, barajar } from '../ui.jsx'

const FORMAS = ['circulo', 'cuadrado', 'triangulo']
const COLORES = [
  { id: 'rojo', hex: '#ff3b5c' },
  { id: 'azul', hex: '#2f6bff' },
  { id: 'amarillo', hex: '#ffcc2f' },
]
const NOMBRE_FORMA = { circulo: 'círculo', cuadrado: 'cuadrado', triangulo: 'triángulo' }

// 3 formas x 3 colores = 9 casillas distintas. Cuadrícula 3x3 exacta.
const COMBOS = FORMAS.flatMap((forma) => COLORES.map((c) => ({ forma, color: c.id })))

const hexDe = (id) => COLORES.find((c) => c.id === id).hex
const etiqueta = (c) => `${NOMBRE_FORMA[c.forma]} ${c.color}`

function Figura({ casilla, tam = 64 }) {
  const hex = hexDe(casilla.color)
  if (casilla.forma === 'circulo')
    return <svg width={tam} height={tam} viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill={hex} /></svg>
  if (casilla.forma === 'cuadrado')
    return <svg width={tam} height={tam} viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="8" fill={hex} /></svg>
  return <svg width={tam} height={tam} viewBox="0 0 100 100"><polygon points="50,10 92,88 8,88" fill={hex} /></svg>
}

function Pantalla({ fase, datos, resumen, jugadores, yo }) {
  const elecciones = usePlayersState('eleccion')
  const soyInfiltrado = yo?.id === datos.infiltradoId
  const miCasilla = datos.grid[soyInfiltrado ? datos.objInfiltrado : datos.objGrupo]
  if (!miCasilla) return null

  const enCasilla = (i) => elecciones.filter((e) => e.state === i).map((e) => e.player)

  if (fase === 'orden')
    return (
      <div className="orden">
        <p className="susurro">Tu orden</p>
        <div className="tarjeta">
          <Figura casilla={miCasilla} tam={110} />
          <p className="instruccion">Pulsa el <b>{etiqueta(miCasilla)}</b></p>
        </div>
        {soyInfiltrado && <p className="aviso">⚠️ Eres el infiltrado: tu orden es distinta.</p>}
      </div>
    )

  if (fase === 'accion')
    return (
      <>
        <p className="susurro">Pulsa el <b>{etiqueta(miCasilla)}</b></p>
        <div className="cuadricula">
          {datos.grid.map((casilla, i) => (
            <button
              key={i}
              className={'casilla' + (yo?.getState('eleccion') === i ? ' mia' : '')}
              onClick={() => myPlayer().setState('eleccion', i)}
            >
              <Figura casilla={casilla} />
              <Fichas jugadores={enCasilla(i)} />
            </button>
          ))}
        </div>
        <p className="pista">Puedes cambiar de casilla hasta que acabe el tiempo.</p>
      </>
    )

  if (fase === 'votacion')
    return (
      <>
        <p className="susurro">¿Quién iba a su bola?</p>
        <div className="votos">
          {jugadores.map((j) => (
            <button
              key={j.id}
              className={'voto' + (yo?.getState('voto') === j.id ? ' elegido' : '') + (j.id === yo?.id ? ' yo' : '')}
              onClick={() => j.id !== yo.id && myPlayer().setState('voto', j.id)}
              disabled={j.id === yo?.id}
            >
              <span className="ficha grande" style={{ background: perfil(j).color }}>{perfil(j).inicial}</span>
              <span className="nombre">{perfil(j).nombre}</span>
            </button>
          ))}
        </div>
      </>
    )

  return (
    <div className="resultado">
      <p className="susurro">El infiltrado era</p>
      <h2 className="revelado">{perfil(jugadores.find((j) => j.id === datos.infiltradoId)).nombre}</h2>
      <p className={resumen?.pillado ? 'pillado' : 'escapado'}>
        {resumen?.pillado ? '¡Le pillasteis!' : 'Se fue de rositas'} · {resumen?.votos} de {resumen?.inocentes} votos
      </p>
      <p className="pista">
        {resumen?.cumplio ? 'Cumplió su orden secreta (+2)' : 'No se atrevió a cumplir su orden'}
      </p>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'ordenFalsa',
  nombre: 'La orden falsa',
  tipo: 'Traición',
  claim: 'Todos reciben la misma orden. Menos uno.',
  minimo: 3,
  estadosJugador: ['eleccion', 'voto'],

  fases: () => [
    { id: 'orden', ms: 7000 },
    { id: 'accion', ms: 7000 },
    { id: 'votacion', ms: 10000 },
    { id: 'resultado', ms: 7000 },
  ],

  preparar: ({ jugadores }) => {
    const a = Math.floor(Math.random() * 9)
    let b = Math.floor(Math.random() * 9)
    while (b === a) b = Math.floor(Math.random() * 9)
    return {
      grid: barajar(COMBOS),
      objGrupo: a,
      objInfiltrado: b,
      infiltradoId: jugadores[Math.floor(Math.random() * jugadores.length)].id,
    }
  },

  resolver: ({ jugadores, datos }) => {
    const infiltrado = jugadores.find((j) => j.id === datos.infiltradoId)
    const inocentes = jugadores.filter((j) => j.id !== datos.infiltradoId)
    const acusadores = inocentes.filter((j) => j.getState('voto') === datos.infiltradoId)
    const pillado = acusadores.length > inocentes.length / 2

    acusadores.forEach((j) => sumarPuntos(j, 1))

    const cumplio = infiltrado?.getState('eleccion') === datos.objInfiltrado
    if (infiltrado) sumarPuntos(infiltrado, (pillado ? 0 : 3) + (cumplio ? 2 : 0))

    return { pillado, votos: acusadores.length, inocentes: inocentes.length, cumplio }
  },

  Pantalla,
}
