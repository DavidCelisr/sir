import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Campo from '../components/Campo.jsx'
import { useSesion } from '../auth/SesionContext.jsx'
import { ETIQUETAS_ROL } from '../constants/roles.js'
import { TIPOS_DOCUMENTO, etiquetaNumero } from '../constants/tiposDocumento.js'

const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))

// El Administrador elige el rol; el Técnico Líder solo crea Técnicos
const OPCIONES_ROL = [
  { valor: 'TECNICO_LIDER', etiqueta: ETIQUETAS_ROL.TECNICO_LIDER },
  { valor: 'TECNICO', etiqueta: ETIQUETAS_ROL.TECNICO },
]

const INICIAL = {
  rol: '', nombres: '', apellidos: '', tipoDocumento: '', numeroDocumento: '',
  correo: '', nombreUsuario: '', password: '', confirmacionPassword: '',
}

const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// // Valida los campos y formatos antes de enviar los datos; el backend también realiza sus propias validaciones.
function validar(d, esAdmin) {
  const errores = {}
  const obligatorio = (campo) => { if (!String(d[campo]).trim()) errores[campo] = 'Este campo es obligatorio' }

  if (esAdmin) obligatorio('rol')
  obligatorio('nombres')
  obligatorio('apellidos')
  obligatorio('tipoDocumento')
  obligatorio('numeroDocumento')

  if (!d.correo.trim()) errores.correo = 'Este campo es obligatorio'
  else if (!correoValido(d.correo.trim())) errores.correo = 'El correo no tiene un formato válido'

  if (!/^[A-Za-z0-9._-]{4,30}$/.test(d.nombreUsuario.trim())) {
    errores.nombreUsuario = 'De 4 a 30 caracteres: letras, números, punto, guion o guion bajo'
  }
  if (d.password.length < 8 || d.password.length > 72) errores.password = 'Debe tener entre 8 y 72 caracteres'

  if (!d.confirmacionPassword) errores.confirmacionPassword = 'Este campo es obligatorio'
  else if (d.confirmacionPassword !== d.password) errores.confirmacionPassword = 'No coincide con la contraseña'
  return errores
}

// Agregar usuario. La contraseña inicial la define quien crea
// el usuario; la persona la cambia después. No se envía ningún correo de aviso.
export default function UsuarioNuevo() {
  const { usuario, llamar } = useSesion()
  const esAdmin = usuario.rol === 'ADMINISTRADOR'
  const navegar = useNavigate()

  const [datos, setDatos] = useState(INICIAL)
  const [errores, setErrores] = useState({})
  const [erroresServidor, setErroresServidor] = useState([])
  const [enviando, setEnviando] = useState(false)

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setErroresServidor([])

    const encontrados = validar(datos, esAdmin)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true) // desactiva el botón: evita crear dos usuarios con un doble clic
    try {
      const creado = await llamar('/api/portal/usuarios', {
        metodo: 'POST',
        cuerpo: {
          // El Líder solo crea Técnicos. El backend también lo comprueba, aunque alguien llame a la API directamente.
          rol: esAdmin ? datos.rol : 'TECNICO',
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          tipoDocumento: datos.tipoDocumento,
          numeroDocumento: datos.numeroDocumento,
          correo: datos.correo,
          nombreUsuario: datos.nombreUsuario,
          password: datos.password, // la confirmación no se envía: solo existe en el frontend
        },
      })
      // Vuelve al listado con un aviso de éxito
      navegar('/usuarios', {
        state: { aviso: `El usuario ${creado.nombre} fue creado. Su usuario es ${creado.nombreUsuario}.` },
      })
    } catch (error) {
      // 409: ya hay un Técnico Líder, el documento ya existe en la empresa o el usuario ya está en uso.
      // Los datos escritos se conservan para poder corregir.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1>Agregar usuario</h1>

      <form noValidate onSubmit={enviar}>
        {esAdmin ? (
          <Campo etiqueta="Rol" nombre="rol" valor={datos.rol} onCambio={cambiar}
            opciones={OPCIONES_ROL} error={errores.rol} />
        ) : (
          <p>Se creará un usuario con el rol {ETIQUETAS_ROL.TECNICO}.</p>
        )}

        <Campo etiqueta="Nombres" nombre="nombres" valor={datos.nombres} onCambio={cambiar} error={errores.nombres} />
        <Campo etiqueta="Apellidos" nombre="apellidos" valor={datos.apellidos} onCambio={cambiar} error={errores.apellidos} />
        <Campo etiqueta="Tipo de documento" nombre="tipoDocumento" valor={datos.tipoDocumento}
          onCambio={cambiar} opciones={OPCIONES_DOCUMENTO} error={errores.tipoDocumento} />
        {/* El nombre de este campo cambia según el tipo de documento elegido */}
        <Campo etiqueta={etiquetaNumero(datos.tipoDocumento)} nombre="numeroDocumento" valor={datos.numeroDocumento}
          onCambio={cambiar} error={errores.numeroDocumento} />
        <Campo etiqueta="Correo electrónico" nombre="correo" tipo="email" valor={datos.correo}
          onCambio={cambiar} error={errores.correo} />
        <Campo etiqueta="Nombre de usuario" nombre="nombreUsuario" valor={datos.nombreUsuario}
          onCambio={cambiar} autoComplete="off" error={errores.nombreUsuario} />
        <Campo etiqueta="Contraseña" nombre="password" tipo="password" valor={datos.password}
          onCambio={cambiar} autoComplete="new-password" error={errores.password}
          ayuda="La persona podrá cambiarla desde su cuenta." />
        <Campo etiqueta="Confirmar contraseña" nombre="confirmacionPassword" tipo="password"
          valor={datos.confirmacionPassword} onCambio={cambiar} autoComplete="new-password"
          error={errores.confirmacionPassword} />

        {erroresServidor.length > 0 && (
          <div className="alerta" role="alert">
            <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        <div className="acciones">
          <Link to="/usuarios">Cancelar</Link>
          <button type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear usuario'}</button>
        </div>
      </form>
    </section>
  )
}