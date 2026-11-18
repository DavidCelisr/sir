import { useState } from 'react'
import Campo from '../../components/Campo.jsx'
import { llamarApi } from '../../api/cliente.js'
import { TIPOS_DOCUMENTO, etiquetaNumero } from '../../constants/tiposDocumento.js'

const OPCIONES = TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))
const INICIAL = { tipoDocumento: '', numeroDocumento: '', nombreUsuario: '', password: '', confirmacionPassword: '' }

// Revisa el formato. Las reglas del usuario y la contraseña son las mismas, la confirmación solo existe en el frontend.
function validar(d) {
  const errores = {}
  if (!d.tipoDocumento) errores.tipoDocumento = 'Este campo es obligatorio'
  if (!d.numeroDocumento.trim()) errores.numeroDocumento = 'Este campo es obligatorio'
  if (!/^[A-Za-z0-9._-]{4,30}$/.test(d.nombreUsuario.trim())) {
    errores.nombreUsuario = 'De 4 a 30 caracteres: letras, números, punto, guion o guion bajo'
  }
  if (d.password.length < 8 || d.password.length > 72) {
    errores.password = 'Debe tener entre 8 y 72 caracteres'
  }
  if (!d.confirmacionPassword) errores.confirmacionPassword = 'Este campo es obligatorio'
  else if (d.confirmacionPassword !== d.password) errores.confirmacionPassword = 'No coincide con la contraseña'
  return errores
}

// Creación del usuario principal de la empresa
export default function FormularioCrearUsuario({ onCreado }) {
  const [datos, setDatos] = useState(INICIAL)
  const [errores, setErrores] = useState({})
  const [erroresServidor, setErroresServidor] = useState([])
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setErroresServidor([])

    const encontrados = validar(datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    try {
      // El rol no se envía: el servidor siempre crea ADMINISTRADOR 
      const creado = await llamarApi('/api/registro/usuario-principal', {
        metodo: 'POST',
        cuerpo: {
          tipoDocumento: datos.tipoDocumento,
          numeroDocumento: datos.numeroDocumento.trim(),
          nombreUsuario: datos.nombreUsuario.trim(),
          password: datos.password,
        },
      })
      onCreado(creado.nombreUsuario)
    } catch (error) {
      // 404 empresa inexistente, 409 ya tiene administrador o usuario en uso, 400 con lista
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form noValidate onSubmit={enviar}>
      <p>Desde aquí solo se crea el usuario principal (administrador) de una empresa ya registrada.
        Los demás usuarios los crea el administrador desde el portal.</p>

      <Campo etiqueta="Tipo de identificación de la empresa" nombre="tipoDocumento" valor={datos.tipoDocumento}
        onCambio={cambiar} opciones={OPCIONES} error={errores.tipoDocumento} />
      <Campo etiqueta={etiquetaNumero(datos.tipoDocumento)} nombre="numeroDocumento" valor={datos.numeroDocumento}
        onCambio={cambiar} error={errores.numeroDocumento} />
      <Campo etiqueta="Nombre de usuario" nombre="nombreUsuario" valor={datos.nombreUsuario}
        onCambio={cambiar} autoComplete="username" error={errores.nombreUsuario} />
      <Campo etiqueta="Contraseña" nombre="password" tipo="password" valor={datos.password}
        onCambio={cambiar} autoComplete="new-password" error={errores.password} />
      <Campo etiqueta="Confirmar contraseña" nombre="confirmacionPassword" tipo="password" valor={datos.confirmacionPassword}
        onCambio={cambiar} autoComplete="new-password" error={errores.confirmacionPassword} />

      {erroresServidor.length > 0 && (
        <div className="alerta" role="alert">
          <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <div className="acciones">
        <button type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear cuenta'}</button>
      </div>
    </form>
  )
}