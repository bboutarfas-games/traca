import { myPlayer } from 'playroomkit'
import { Ficha, Podio, perfil, sumarPuntos, alAzar } from '../ui.jsx'

// El suelo se va estrechando: cada asalto hay menos sitio donde meterse.
const SUELO = [6, 4, 3, 2]

function Baldosa({ n, elegida, hundida, gente, onClick, disabled }) {
  return (
    <button
      className={'baldosa' + (elegida ? ' mia' : '') + (hundida ? ' hundida' : '') + (disabled ? ' quieta' : '')}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="numero">{hundida ? '💥' : n + 1}</span>
      <div className="fichas">{gente.map((j) => <Ficha key={j.id} jugador={j} />)}</div>
    </button>
  )
}

function Pantalla({ fase, vivo, resumen, jugadores, yo }) {
  const vivos = vivo?.vivos || []
  const sigoVivo = vivos.includes(yo?.id)
  const casillas = SUELO[Math.min(vivo?.asalto || 0, SUELO.length - 1)]
  const miBaldosa = yo?.getState('baldosa')
  const ultima = vivo?.ultima
  const enPie = jugadores.filter((j) => vivos.includes(j.id))

  const elegir = (n) => {
    if (fase !== 'elegir' || !sigoVivo) return
    myPlayer().setState('baldosa', n)
  }

  if (fase === 'aviso')
    return (
      <div className="orden">
        <p className="susurro">Se hunde la más llena</p>
        <div className="tarjeta">
          <p className="instruccion">
            Elegid baldosa. Si dos coincidís, se hunde la <b>más llena</b> y caen sus ocupantes.
          </p>
        </div>
        <p className="pista">Si cada uno va a la suya, no se hunde nada. Pero el suelo se estrecha.</p>
      </div>
    )

  if (fase === 'elegir')
    return (
      <>
        <p className="susurro">
          {sigoVivo ? <>Quedan <b>{enPie.length}</b> en pie · {casillas} baldosas</> : 'Estás fuera. A mirar.'}
        </p>
        <div className="baldosas" style={{ '--cols': Math.min(casillas, 3) }}>
          {Array.from({ length: casillas }, (_, n) => (
            <Baldosa
              key={n}
              n={n}
              elegida={miBaldosa === n}
              gente={[]}
              onClick={() => elegir(n)}
              disabled={!sigoVivo}
            />
          ))}
        </div>
        <p className="pista">Nadie ve dónde te metes hasta que cruje el suelo.</p>
      </>
    )

  if (fase === 'crujido') {
    const caidos = jugadores.filter((j) => (ultima?.caidos || []).includes(j.id))
    return (
      <>
        <p className="susurro">
          {ultima?.hundida == null ? 'No se hundió nada' : `Se hunde la baldosa ${ultima.hundida + 1}`}
        </p>
        <div className="baldosas" style={{ '--cols': Math.min(ultima?.casillas || 3, 3) }}>
          {Array.from({ length: ultima?.casillas || 0 }, (_, n) => (
            <Baldosa
              key={n}
              n={n}
              hundida={ultima?.hundida === n}
              gente={jugadores.filter((j) => ultima?.donde?.[j.id] === n)}
              disabled
            />
          ))}
        </div>
        <p className={caidos.length ? 'escapado' : 'pillado'}>
          {caidos.length ? `Caen ${caidos.map((j) => perfil(j).nombre).join(', ')}` : 'No cae nadie'}
        </p>
      </>
    )
  }

  const supervivientes = jugadores.filter((j) => (resumen?.vivos || []).includes(j.id))
  return (
    <div className="resultado">
      <p className="susurro">Siguen en pie</p>
      <h2 className="revelado">
        {supervivientes.length ? supervivientes.map((j) => perfil(j).nombre).join(', ') : 'Nadie'}
      </h2>
      <p className="pista">{supervivientes.length ? '+2 para cada uno' : 'Se hundió el plató entero'}</p>
      <div className="fichas">{supervivientes.map((j) => <Ficha key={j.id} jugador={j} />)}</div>
      <Podio jugadores={jugadores} compacto />
    </div>
  )
}

export default {
  id: 'elUltimoEnPie',
  nombre: 'El último en pie',
  tipo: 'Todos contra todos',
  claim: 'La baldosa más llena se hunde.',
  minimo: 3,
  estadosJugador: ['baldosa'],
  inicial: { vivos: null, asalto: 0, ultima: null },

  fases: () => [
    { id: 'aviso', ms: 4000 },
    ...SUELO.map(() => [{ id: 'elegir', ms: 3800 }, { id: 'crujido', ms: 2800 }]).flat(),
    { id: 'resultado', ms: 6500 },
  ],

  preparar: () => ({ suelo: SUELO }),

  alEntrar: ({ jugadores, vivo, fase }) => {
    if (!vivo) return null

    // La primera vez que se elige, entran todos en juego.
    if (fase === 'elegir' && vivo.vivos === null)
      return { ...vivo, vivos: jugadores.map((j) => j.id) }

    if (fase !== 'crujido') return null

    const casillas = SUELO[Math.min(vivo.asalto, SUELO.length - 1)]
    const vivos = vivo.vivos || jugadores.map((j) => j.id)
    const enPie = jugadores.filter((j) => vivos.includes(j.id))

    const donde = {}
    const ocupacion = {}
    const sinElegir = []
    enPie.forEach((j) => {
      const n = j.getState('baldosa')
      if (n == null || n >= casillas) { sinElegir.push(j.id); return }
      donde[j.id] = n
      ;(ocupacion[n] ||= []).push(j.id)
    })

    // Se hunde la más llena, pero solo si hay aglomeración: si cada uno está en
    // una baldosa distinta, no se hunde nada. Repartirse tiene que servir.
    const maximo = Math.max(0, ...Object.values(ocupacion).map((g) => g.length))
    const candidatas = maximo >= 2
      ? Object.keys(ocupacion).filter((n) => ocupacion[n].length === maximo)
      : []
    const hundida = candidatas.length ? Number(alAzar(candidatas)) : null

    const caidos = [...(hundida == null ? [] : ocupacion[hundida]), ...sinElegir]
    jugadores.forEach((j) => j.setState('baldosa', null))

    return {
      vivos: vivos.filter((id) => !caidos.includes(id)),
      asalto: vivo.asalto + 1,
      ultima: { hundida, donde, caidos, casillas },
    }
  },

  resolver: ({ jugadores, vivo }) => {
    const vivos = vivo?.vivos || []
    jugadores.filter((j) => vivos.includes(j.id)).forEach((j) => sumarPuntos(j, 2))
    return { vivos }
  },

  Pantalla,
}
