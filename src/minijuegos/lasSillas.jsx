import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos } from '../ui.jsx'

function Silla({ tam = 56, apagada }) {
  const color = apagada ? '#4a3b6b' : '#ffcc2f'
  return (
    <svg width={tam} height={tam} viewBox="0 0 100 100">
      <rect x="24" y="10" width="52" height="42" rx="6" fill={color} />
      <rect x="24" y="54" width="52" height="12" rx="4" fill={color} />
      <rect x="28" y="66" width="9" height="26" rx="3" fill={color} />
      <rect x="63" y="66" width="9" height="26" rx="3" fill={color} />
    </svg>
  )
}

function Pantalla({ fase, datos, resumen, jugadores, yo }) {
  const falso = yo?.getState('falso')
  const miSilla = yo?.getState('silla')
  const sillas = Array.from({ length: datos.sillas }, (_, i) => i)

  if (fase === 'musica')
    return (
      <>
        <p className="susurro">Suena la música… <b>no te sientes todavía</b></p>
        <button
          className={'pista-musica' + (falso ? ' quemado' : '')}
          onClick={() => !falso && myPlayer().setState('falso', true)}
          disabled={falso}
        >
          {falso ? '🙈 Salida en falso' : '🎵'}
        </button>
        <p className="pista">
          {falso ? 'Te has adelantado. Esta ronda la ves desde la barrera.' : 'Si pulsas antes de la señal, quedas fuera.'}
        </p>
      </>
    )

  if (fase === 'pelea')
    return (
      <>
        <p className="susurro">
          {falso ? 'Estás fuera de esta ronda' : <>¡YA! Hay <b>{datos.sillas}</b> sillas para {jugadores.length}</>}
        </p>
        <div className="sillas">
          {sillas.map((i) => (
            <button
              key={i}
              className={'silla' + (miSilla === i ? ' mia' : '')}
              onClick={() => !falso && miSilla == null && myPlayer().setState('silla', i)}
              disabled={falso || miSilla != null}
            >
              <Silla apagada={falso} />
            </button>
          ))}
        </div>
        <p className="pista">
          {miSilla != null ? 'Sentado. A ver si has elegido bien.' : 'Si dos elegís la misma silla, os quedáis los dos fuera.'}
        </p>
      </>
    )

  const porSilla = resumen?.porSilla || {}
  const busca = (ids) => jugadores.filter((j) => ids.includes(j.id))

  return (
    <div className="resultado">
      <p className="susurro">A ver dónde se ha sentado cada uno</p>
      <div className="sillas reveladas">
        {sillas.map((i) => {
          const ids = porSilla[i] || []
          const estado = ids.length === 1 ? 'salvado' : ids.length > 1 ? 'choque' : 'vacia'
          return (
            <div key={i} className={'silla ' + estado}>
              <Silla apagada={estado !== 'salvado'} />
              <div className="fichas">{busca(ids).map((j) => <Ficha key={j.id} jugador={j} />)}</div>
            </div>
          )
        })}
      </div>
      <p className={resumen?.salvados?.length ? 'pillado' : 'escapado'}>
        {resumen?.salvados?.length
          ? `Se salvan ${busca(resumen.salvados).map((j) => perfil(j).nombre).join(', ')}`
          : 'No se ha salvado nadie'}
      </p>
      {resumen?.choques > 0 && (
        <p className="pista">{resumen.choques} silla(s) peleada(s): fuera los dos.</p>
      )}
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'lasSillas',
  nombre: 'Las sillas',
  tipo: 'Todos contra todos',
  claim: 'Hay una silla menos que jugadores. Y no puedes compartirla.',
  minimo: 3,
  estadosJugador: ['silla', 'falso'],
  musicaEn: 'musica',

  // La música dura un rato distinto cada vez: esa es la trampa.
  fases: (datos) => [
    { id: 'musica', ms: datos.musicaMs, reloj: false },
    { id: 'pelea', ms: 3500 },
    { id: 'resultado', ms: 7000 },
  ],

  preparar: ({ jugadores }) => ({
    sillas: Math.max(1, jugadores.length - 1),
    musicaMs: 2000 + Math.floor(Math.random() * 3500),
  }),

  resolver: ({ jugadores }) => {
    const porSilla = {}
    jugadores.forEach((j) => {
      if (j.getState('falso')) return
      const s = j.getState('silla')
      if (s == null) return
      ;(porSilla[s] ||= []).push(j.id)
    })

    const salvados = []
    let choques = 0
    Object.values(porSilla).forEach((ids) => {
      if (ids.length === 1) salvados.push(ids[0])
      else choques++
    })

    jugadores.filter((j) => salvados.includes(j.id)).forEach((j) => sumarPuntos(j, 1))
    return { porSilla, salvados, choques }
  },

  Pantalla,
}
