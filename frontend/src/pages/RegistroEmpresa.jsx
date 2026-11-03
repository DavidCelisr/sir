import { useParams } from 'react-router'

// Pantalla 1: registro de empresa 
// Provisional: el formulario se construye en la rama siguiente.
export default function RegistroEmpresa() {
  const { token } = useParams() // el :token de la URL /invitacion/:token
  return (
    <main>
      <h1>Registro de empresa</h1>
      <p>Invitación: {token}</p>
    </main>
  )
}