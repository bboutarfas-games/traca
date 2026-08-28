import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos, alAzar } from '../ui.jsx'

const ASALTOS = 3
const EMPUJES_MAX = 2   // nadie aguanta los tres asaltos: todos descansan alguno

const objetivoDe = (n) => (n - 1) * EMPUJES_MAX

function Pantalla({ fase, datos, vivo, resumen, jugadores, yo }) {
  const soySaboteador = yo?.id === datos.saboteadorId
  const gastados = vivo?.empujes?.[yo?.id] || 0
  const sinFuerza = gastados >= EMPUJES_MAX
  const miAccion = yo?.getState('accion')
  const objetivo = objetivoDe(jugadores.length)
  const total = vivo?.total || 0

  const elegir = (a) => {
    if (fase !== 'asalto') return
    if (a === 'empujar' && sinFuerza) return
    myPlayer().setState('accion', a)
  }

  const Barra = () => (
    <>
      <div className="vagon">
        <div className="avance" style={{ width: `${Math.max(0, Math.min(100, (total / objetivo) * 100))}%` }} />
      </div>
      <p className="pista">{total} de {objetivo} empujes</p>
    </>
  )

  if (fase === 'reparto')
    return (
      <div className="orden">
        <p className="susurro">Hay que mover el armatoste</p>
        <div className="tarjeta">
          <p className="instruccion">
            Entre todos hacen falta <b>{objetivo}</b> empujes en {ASALTOS} asaltos.
          </p>
        </div>
        {soySaboteador ? (
          <p className="aviso">🕳️ Eres el saboteador. Ganas si NO llega. Puedes frenar a escondidas.</p>
        ) : (
          <p className="pista">Solo puedes empujar {EMPUJES_MAX} veces: alguna tendrás que descansar.</p>
        )}
      </div>
    )

  if (fase === 'asalto')
    return (
      <>
        <p className="susurro">Asalto {(vivo?.asalto || 0) + 1} de {ASALTOS}</p>
        <Barra />
        <div className="acciones">
          <button
            className={'opcion' + (miAccion === 'empujar' ? ' activa' : '')}
            onClick={() => elegir('empujar')}
            disabled={sinFuerza}
          >
            <b>Empujar</b>
            <span>{sinFuerza ? 'sin fuerza' : `+1 · te quedan ${EMPUJES_MAX - gastados}`}</span>
          </button>
          <button
            className={'opcion' + (miAccion === 'descansar' ? ' activa' : '')}
            onClick={() => elegir('descansar')}
          >
            <b>Descansar</b>
            <span>0</span>
          </button>
          {soySaboteador && (
            <button
              className={'opcion traidora' + (miAccion === 'frenar' ? ' activa' : '')}
              onClick={() => elegir('frenar')}
            >
              <b>Frenar</b>
              <span>−1 · solo tú lo ves</span>
            </button>
          )}
        </div>
        <p className="pista">Nadie sabe qué ha hecho cada uno. Solo se ve cuánto avanza.</p>
      </>
    )

  if (fase === 'tiron')
    return (
      <>
        <p className="susurro">
          El asalto suma <b>{vivo?.ultima?.neto >= 0 ? '+' : ''}{vivo?.ultima?.neto ?? 0}</b>
        </p>
        <Barra />
        <p className="pista">
          {vivo?.ultima?.neto < (vivo?.ultima?.esperado ?? 0)
            ? 'Ha avanzado menos de lo que debería…'
            : 'Va bien. Por ahora.'}
        </p>
      </>
    )

  if (fase === 'votacion')
    return (
      <>
        <p className="susurro">
          {resumen?.llegaron ? 'Llegasteis. Aun así, ¿quién frenaba?' : 'No llegasteis. ¿Quién ha sido?'}
        </p>
        <Barra />
        <div className="votos">
          {jugadores.map((j) => (
            <button
              key={j.id}
              className={'voto' + (yo?.getState('voto') === j.id ? ' elegido' : '') + (j.id === yo?.id ? ' yo' : '')}
              onClick={() => j.id !== yo.id && myPlayer().setState('voto', j.id)}
              disabled={j.id === yo?.id}
            >
              <Ficha jugador={j} grande />
              <span className="nombre">{perfil(j).nombre}</span>
            </button>
          ))}
        </div>
      </>
    )

  const saboteador = jugadores.find((j) => j.id === datos.saboteadorId)
  return (
    <div className="resultado">
      <p className="susurro">El saboteador era</p>
      <h2 className="revelado">{perfil(saboteador).nombre}</h2>
      <p className={resumen?.pillado ? 'pillado' : 'escapado'}>
        {resumen?.pillado ? '¡Le pillasteis!' : 'Nadie lo vio venir'} · {resumen?.votos} de {resumen?.inocentes} votos
      </p>
      <p className="pista">
        {resumen?.llegaron
          ? `El armatoste llegó: +2 para los inocentes. Frenó ${resumen?.frenadas} vez(ces).`
          : `Se quedó en ${resumen?.total} de ${resumen?.objetivo}.`}
      </p>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'elSaboteador',
  nombre: 'El saboteador',
  tipo: 'Traición',
  claim: 'Uno de vosotros está frenando.',
  minimo: 4,
  estadosJugador: ['accion', 'voto'],
  inicial: { asalto: 0, total: 0, empujes: {}, frenadas: 0, ultima: null },

  fases: () => [
    { id: 'reparto', ms: 5000 },
    ...Array.from({ length: ASALTOS }, () => [
      { id: 'asalto', ms: 4500 },
      { id: 'tiron', ms: 2600 },
    ]).flat(),
    { id: 'votacion', ms: 9000 },
    { id: 'resultado', ms: 7500 },
  ],

  preparar: ({ jugadores }) => ({ saboteadorId: alAzar(jugadores).id }),

  alEntrar: ({ jugadores, vivo, fase }) => {
    if (fase !== 'tiron' || !vivo) return null

    const empujes = { ...vivo.empujes }
    let neto = 0
    let esperado = 0
    let frenadas = vivo.frenadas

    jugadores.forEach((j) => {
      const a = j.getState('accion')
      const gastados = empujes[j.id] || 0
      if (a === 'empujar' && gastados < EMPUJES_MAX) {
        empujes[j.id] = gastados + 1
        neto += 1
        esperado += 1
      } else if (a === 'frenar') {
        neto -= 1
        frenadas += 1
      }
    })

    jugadores.forEach((j) => j.setState('accion', null))

    return {
      asalto: vivo.asalto + 1,
      total: vivo.total + neto,
      empujes,
      frenadas,
      ultima: { neto, esperado },
    }
  },

  resolver: ({ jugadores, datos, vivo }) => {
    const objetivo = objetivoDe(jugadores.length)
    const total = vivo?.total || 0
    const llegaron = total >= objetivo

    const saboteador = jugadores.find((j) => j.id === datos.saboteadorId)
    const inocentes = jugadores.filter((j) => j.id !== datos.saboteadorId)
    const acusadores = inocentes.filter((j) => j.getState('voto') === datos.saboteadorId)
    const pillado = acusadores.length > inocentes.length / 2

    if (llegaron) inocentes.forEach((j) => sumarPuntos(j, 2))
    acusadores.forEach((j) => sumarPuntos(j, 1))
    if (saboteador && !llegaron && !pillado) sumarPuntos(saboteador, 3)
    if (saboteador && !llegaron && pillado) sumarPuntos(saboteador, 1)

    return {
      llegaron,
      total,
      objetivo,
      pillado,
      votos: acusadores.length,
      inocentes: inocentes.length,
      frenadas: vivo?.frenadas || 0,
    }
  },

  Pantalla,
}
