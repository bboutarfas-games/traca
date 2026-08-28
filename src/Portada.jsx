import { useState } from 'react'
import { MINIJUEGOS, PENDIENTES } from './minijuegos/index.js'

const PROGRAMA = [
  ...MINIJUEGOS.map((m) => ({ nombre: m.nombre, tipo: m.tipo, listo: true })),
  ...PENDIENTES,
]

export default function Portada({ conectando, salaPrevia, error, onCrear, onUnirse }) {
  const [codigo, setCodigo] = useState('')

  return (
    <div className="plato">
      <div className="foco" />
      <main className="contenido portada">
        <p className="rotulo">Concurso</p>
        <h1 className="logo">TRACA</h1>
        <p className="claim">Pruebas al azar, una por ronda. Un solo ganador.</p>
        <p className="requisito">De 3 a 8 jugadores · cada uno en su pantalla · de 1 a 3 minutos</p>

        {conectando ? (
          <p className="espera">Conectando…</p>
        ) : (
          <>
            <div className="acciones">
              <button className="boton" onClick={onCrear}>Crear partida</button>

              <form
                className="unirse"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (codigo.trim()) onUnirse(codigo.trim().toUpperCase())
                }}
              >
                <input
                  className="campo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO"
                  maxLength={8}
                  aria-label="Código de sala"
                />
                <button className="boton fino" type="submit" disabled={!codigo.trim()}>
                  Unirse
                </button>
              </form>
            </div>

            {salaPrevia && (
              <button className="enlace" onClick={() => onUnirse(salaPrevia)}>
                Volver a la sala {salaPrevia}
              </button>
            )}

            {error && <p className="error">{error}</p>}
          </>
        )}

        <section className="programa">
          <p className="pista">
            El programa saca las pruebas al azar. Estas son las {PROGRAMA.length} que tiene
            ({MINIJUEGOS.length} listas):
          </p>
          <p className="repertorio">
            {PROGRAMA.map((m, i) => (
              <span key={m.nombre} className={m.listo ? 'listo' : ''}>
                {m.nombre}
                {!m.listo && <i> (pronto)</i>}
                {i < PROGRAMA.length - 1 && <span className="sep"> · </span>}
              </span>
            ))}
          </p>
        </section>
      </main>
    </div>
  )
}
