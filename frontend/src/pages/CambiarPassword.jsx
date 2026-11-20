import { useState } from 'react'
import { Link } from 'react-router'
import Campo from '../components/Campo.jsx'
import { useSesion } from '../auth/SesionContext.jsx'

const INICIAL = { passwordActual: '', passwordNueva: '', confirmacionPassword: '' }

// Mismas reglas provisionales del backend: de 8 a 72 caracteres, distinta de la actual
// y con confirmación. El backend siempre vuelve a validar.
function validar(d) {
  const errores = {}
  if (!d.passwordActual) errores.passwordActual = 'Este campo es obligatorio'

  if (d.passwordNueva.length < 8 || d.passwordNueva.length > 72) {
    errores.passwordNueva = 'Debe tener entre 8 y 72 caracteres'
  } else if (d.passwordNueva === d.passwordActual) {
    errores.passwordNueva = 'Debe ser distinta de la actual'
  }

  if (!d.confirmacionPassword) errores.confirmacionPassword = 'Este campo es obligatorio'
  else if (d.confirmacionPassword !== d.passwordNueva) errores.confirmacionPassword = 'No coincide con la nueva contraseña'
  return errores
}

// Cambiar contraseña: los tres roles, cada uno la suya. La cuenta sale
// del token, así que esta pantalla nunca envía un id de usuario.
export default function CambiarPassword() {
  const { llamar } = useSesion()
  const [datos, setDatos] = useState(INICIAL)
  const [errores, setErrores] = useState({})
  const [erroresServidor, setErroresServidor] = useState([])
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setExito(false)
    setErroresServidor([])

    const encontrados = validar(datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true) // desactiva el botón: evita enviar dos veces con un doble clic
    try {
      await llamar('/api/portal/usuarios/mi-password', { metodo: 'PATCH', cuerpo: datos })
      // La sesión sigue activa: no hay que iniciar sesión de nuevo
      setDatos(INICIAL)
      setExito(true)
    } catch (error) {
      // 400: la contraseña actual es incorrecta, o una lista de errores de formato.
      // No cierra la sesión: ese cierre solo ocurre con un 401.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1>Cambiar contraseña</h1>
      <p>Después del cambio su sesión actual sigue activa.</p>

      <form noValidate onSubmit={enviar}>
        <Campo etiqueta="Contraseña actual" nombre="passwordActual" tipo="password" valor={datos.passwordActual}
          onCambio={cambiar} autoComplete="current-password" error={errores.passwordActual} />
        <Campo etiqueta="Nueva contraseña" nombre="passwordNueva" tipo="password" valor={datos.passwordNueva}
          onCambio={cambiar} autoComplete="new-password" error={errores.passwordNueva} />
        <Campo etiqueta="Confirmar nueva contraseña" nombre="confirmacionPassword" tipo="password"
          valor={datos.confirmacionPassword} onCambio={cambiar} autoComplete="new-password"
          error={errores.confirmacionPassword} />

        {erroresServidor.length > 0 && (
          <div className="alerta" role="alert">
            <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {exito && <div className="exito" role="status">Contraseña actualizada.</div>}

        <div className="acciones">
          <Link to="/inicio">Volver al inicio</Link>
          <button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </div>
      </form>
    </section>
  )
}