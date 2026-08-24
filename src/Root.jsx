import { useState } from 'react'
import { insertCoin, isHost, getParticipants } from 'playroomkit'
import App from './App.jsx'
import Portada from './Portada.jsx'

// Playroom guarda el código de sala en el hash de la URL. Si no lo limpiamos,
// recargar te devuelve a la partida anterior sin preguntar.
const salaEnLaUrl = () => {
  const m = window.location.hash.match(/r=([A-Za-z0-9]+)/)
  return m ? m[1] : null
}

// Playroom no distingue entre unirse y crear: si le das un código que no
// existe, monta la sala. Como no se puede deshacer en caliente, avisamos por
// sessionStorage y recargamos limpio.
const AVISO = 'salaInexistente'

export default function Root() {
  const [pantalla, setPantalla] = useState('portada')
  const [salaPrevia] = useState(salaEnLaUrl)
  const [error, setError] = useState(() => {
    const codigo = sessionStorage.getItem(AVISO)
    if (!codigo) return ''
    sessionStorage.removeItem(AVISO)
    return `No hay ninguna partida con el código ${codigo}. Comprueba que esté bien escrito, o crea una tú.`
  })

  const entrar = async (roomCode) => {
    setError('')
    setPantalla('conectando')
    if (!roomCode) window.location.hash = ''
    try {
      // skipLobby: nos saltamos la pantalla de Playroom. Así la duración y el
      // código de sala se ven de inmediato, y un código inexistente no llega a
      // enseñar un lobby falso antes de rebotar.
      await insertCoin({
        maxPlayersPerRoom: 8,
        skipLobby: true,
        roomCode: roomCode || undefined,
      })

      // Si veníamos con código y hemos acabado de anfitriones y solos, es que
      // la sala no existía y Playroom la ha creado de la nada.
      if (roomCode) {
        await new Promise((r) => setTimeout(r, 700))
        const solos = Object.keys(getParticipants() || {}).length <= 1
        if (isHost() && solos) {
          sessionStorage.setItem(AVISO, roomCode)
          window.location.hash = ''
          window.location.reload()
          return
        }
      }

      setPantalla('juego')
    } catch (e) {
      setError(e?.message || 'No se pudo entrar en la sala')
      setPantalla('portada')
    }
  }

  if (pantalla === 'juego') return <App />

  return (
    <Portada
      conectando={pantalla === 'conectando'}
      salaPrevia={salaPrevia}
      error={error}
      onCrear={() => entrar(null)}
      onUnirse={(codigo) => entrar(codigo)}
    />
  )
}
