import { Link } from 'react-router'

// Pantalla final: contrato asignado y siguiente paso.
export default function Exito({ numeroContrato, correo }) {
  return (
    <section>
      <h1>Registro completado</h1>
      <p>Su número de contrato es <strong>{numeroContrato}</strong>.</p>
      <p>Enviamos un correo de bienvenida a {correo} con las instrucciones para crear su usuario en el portal.</p>
      <Link to="/portal">Ir al portal</Link>
    </section>
  )
}