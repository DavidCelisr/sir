import { useState } from 'react'
import Campo from '../../components/Campo.jsx'
import { llamarApi } from '../../api/cliente.js'
import { useSesion } from '../../auth/SesionContext.jsx'

// Inicio de sesion. El login no lleva token, así que una clave incorrecta
// no dispara el cierre de sesión global.
export default function FormularioLogin({ onOlvido }) {
  const { iniciarSesion } = useSesion()
  const [datos, setDatos] = useState({ nombreUsuario: '', password: '' })
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setErrorServidor('')

    // Validación de formato, el backend siempre vuelve a validar
    const encontrados = {}
    if (!datos.nombreUsuario.trim()) encontrados.nombreUsuario = 'Este campo es obligatorio'
    if (!datos.password) encontrados.password = 'Este campo es obligatorio'
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true) // desactiva el botón: evita enviar dos veces con un doble clic
    try {
      const { token } = await llamarApi('/api/auth/login', {
        metodo: 'POST',
        cuerpo: { nombreUsuario: datos.nombreUsuario.trim(), password: datos.password },
      })
      await iniciarSesion(token) // guarda el token y pide usuario y empresa
    } catch (error) {
      // Mensajes del backend: credenciales incorrectas, cuenta desactivada, empresa inactiva
      setErrorServidor(error.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={enviar}>
      <Campo etiqueta="Usuario" nombre="nombreUsuario" valor={datos.nombreUsuario} onCambio={cambiar}
        autoComplete="username" error={errores.nombreUsuario} />
      <Campo etiqueta="Contraseña" nombre="password" tipo="password" valor={datos.password} onCambio={cambiar}
        autoComplete="current-password" error={errores.password} />

      {errorServidor && <div className="alerta" role="alert">{errorServidor}</div>}

      <div className="acciones">
        <button type="submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      </div>

      {/* RF-11: todos los usuarios pueden recuperar su contraseña */}
      <p>
        <button type="button" className="enlace" onClick={onOlvido}>Olvidé mi contraseña</button>
      </p>
    </form>
  )
}