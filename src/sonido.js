// Sonido sintetizado con WebAudio: ni un fichero de audio, ni una descarga.
// El navegador no deja crear el contexto hasta que el usuario toca algo, así que
// se monta perezosamente en el primer sonido (que siempre viene de un clic).

const CLAVE = 'traca:silencio'

let ctx = null
let master = null
let latido = null
let silencio = localStorage.getItem(CLAVE) === '1'

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = silencio ? 0 : 0.22
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Una nota: onda, altura, duración y un deslizamiento opcional de tono.
function nota({ hz, dur = 0.12, tipo = 'triangle', vol = 1, tras = 0, hasta }) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + tras
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = tipo
  osc.frequency.setValueAtTime(hz, t)
  if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

const acorde = (hzs, dur, tipo = 'triangle') =>
  hzs.forEach((hz, i) => nota({ hz, dur, tipo, vol: 0.5, tras: i * 0.06 }))

// Do mayor de feria, para la musiquilla de Las sillas.
const VUELTA = [523, 659, 784, 659, 587, 698, 880, 698]

export const sonido = {
  pulsar: () => nota({ hz: 420, dur: 0.05, tipo: 'square', vol: 0.35 }),
  cambio: () => nota({ hz: 340, dur: 0.09, tipo: 'sine', vol: 0.4, hasta: 520 }),
  tic: () => nota({ hz: 880, dur: 0.07, tipo: 'square', vol: 0.5 }),
  aviso: () => nota({ hz: 180, dur: 0.25, tipo: 'sawtooth', vol: 0.5, hasta: 90 }),
  revelar: () => acorde([523, 659, 784], 0.3),
  bien: () => acorde([523, 659, 784, 1047], 0.34),
  mal: () => nota({ hz: 300, dur: 0.45, tipo: 'sawtooth', vol: 0.6, hasta: 110 }),
  fanfarria: () => acorde([523, 659, 784, 1047, 1319], 0.5),

  musicaOn() {
    if (latido) return
    let i = 0
    audio()
    latido = setInterval(() => {
      nota({ hz: VUELTA[i % VUELTA.length], dur: 0.13, tipo: 'square', vol: 0.3 })
      i++
    }, 165)
  },

  musicaOff() {
    if (!latido) return
    clearInterval(latido)
    latido = null
  },

  get silenciado() {
    return silencio
  },

  alternarSilencio() {
    silencio = !silencio
    localStorage.setItem(CLAVE, silencio ? '1' : '0')
    if (master) master.gain.value = silencio ? 0 : 0.22
    return silencio
  },
}
