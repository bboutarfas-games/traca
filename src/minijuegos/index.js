import ordenFalsa from './ordenFalsa.jsx'
import lasSillas from './lasSillas.jsx'
import elAscensor from './elAscensor.jsx'

// Los que ya se pueden jugar.
export const MINIJUEGOS = [ordenFalsa, lasSillas, elAscensor]

// Los que faltan, solo para enseñarlos en la portada.
export const PENDIENTES = [
  { nombre: 'El foco', tipo: 'Uno contra el resto' },
  { nombre: 'La contraseña', tipo: 'Todos contra el juego' },
  { nombre: 'El último en pie', tipo: 'Todos contra todos' },
  { nombre: 'El portero', tipo: 'Uno contra el resto' },
  { nombre: 'El saboteador', tipo: 'Traición' },
]
