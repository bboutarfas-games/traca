// Piezas compartidas por todos los minijuegos.

// El perfil de un jugador recién entrado puede llegar vacío durante un frame.
export const perfil = (j) => {
  const p = j?.getProfile?.() || {}
  const propio = j?.getState?.('nombre')
  const nombre = (propio || p.name || '…').trim()
  return {
    nombre,
    color: p.color?.hexString || '#6b5b95',
    inicial: (nombre || '?').slice(0, 1).toUpperCase(),
  }
}

export function Ficha({ jugador, grande }) {
  const p = perfil(jugador)
  return (
    <span className={'ficha' + (grande ? ' grande' : '')} style={{ background: p.color }} title={p.nombre}>
      {p.inicial}
    </span>
  )
}

export function Fichas({ jugadores }) {
  return (
    <div className="fichas">
      {jugadores.map((j) => <Ficha key={j.id} jugador={j} />)}
    </div>
  )
}

export function Escenario({ children }) {
  return (
    <div className="plato">
      <div className="foco" />
      <main className="contenido">{children}</main>
    </div>
  )
}

export function Podio({ jugadores, compacto }) {
  const orden = [...jugadores].sort((a, b) => (b.getState('puntos') || 0) - (a.getState('puntos') || 0))
  return (
    <ol className={'podio' + (compacto ? ' compacto' : '')}>
      {orden.map((j, i) => (
        <li key={j.id}>
          <Ficha jugador={j} />
          <span className="nombre">{perfil(j).nombre}</span>
          <span className="pts">{j.getState('puntos') || 0}</span>
          {!compacto && i === 0 && <span className="corona">👑</span>}
        </li>
      ))}
    </ol>
  )
}

export const sumarPuntos = (jugador, n) =>
  jugador.setState('puntos', (jugador.getState('puntos') || 0) + n)

export const barajar = (xs) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const alAzar = (xs) => xs[Math.floor(Math.random() * xs.length)]
