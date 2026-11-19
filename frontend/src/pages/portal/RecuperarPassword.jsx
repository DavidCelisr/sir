import { useEffect, useState } from 'react'
import Campo from '../../components/Campo.jsx'
import { llamarApi } from '../../api/cliente.js'

// el backend ignora una nueva solicitud si la anterior fue hace menos de 60 s.
// "Reenviar código" espera el mismo tiempo para no confundir al usuario.
const ESPERA_SEGUNDOS = 60

// Deja pasar solo dígitos: si se escribe una letra, no aparece en el campo
const soloDigitos = (alCambiar) => (e) => {
  e.target.value = e.target.value.replace(/\D/g, '')
  alCambiar(e)
}

const INICIAL = { nombreUsuario: '', codigo: '', passwordNueva: '', confirmacionPassword: '' }

// Recuperación de contraseña con código OTP, en tres pasos:
//   1. usuario: pide el código (el backend lo envía al correo registrado)
//   2. codigo: el usuario lo escribe (aquí solo se revisa el formato)
//   3. password: nueva contraseña; el código se valida en este paso, junto con la clave
export default function RecuperarPassword({ onTerminado, onVolver }) {
  const [paso, setPaso] = useState('usuario') // 'usuario' | 'codigo' | 'password'
  const [datos, setDatos] = useState(INICIAL)
  const [errores, setErrores] = useState({}) // errores por campo, del frontend
  const [erroresServidor, setErroresServidor] = useState([]) // errores que devuelve el backend
  const [info, setInfo] = useState('') // mensaje de la solicitud
  const [enviando, setEnviando] = useState(false)
  const [restantes, setRestantes] = useState(0) // segundos para poder pedir otro código

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))
  const numeroPaso = { usuario: 1, codigo: 2, password: 3 }[paso]

  // Cuenta regresiva del botón "Reenviar código": baja un segundo por vez
  useEffect(() => {
    if (restantes <= 0) return
    const temporizador = setTimeout(() => setRestantes((s) => s - 1), 1000)
    return () => clearTimeout(temporizador)
  }, [restantes])

  // Pide el código al backend. Devuelve true si la solicitud se hizo.
  async function pedirCodigo() {
    const nombreUsuario = datos.nombreUsuario.trim()
    if (!nombreUsuario) {
      setErrores({ nombreUsuario: 'Este campo es obligatorio' })
      return false
    }
    setErrores({})
    setErroresServidor([])
    setEnviando(true)
    try {
      // La respuesta es siempre la misma, exista o no el usuario
      const respuesta = await llamarApi('/api/auth/recuperar/solicitar', {
        metodo: 'POST',
        cuerpo: { nombreUsuario },
      })
      setInfo(respuesta.mensaje)
      setRestantes(respuesta.segundosEspera ?? ESPERA_SEGUNDOS)
      return true
    } catch (error) {
      setErroresServidor([error.message])
      return false
    } finally {
      setEnviando(false)
    }
  }

  // Paso 1: pedir el código y pasar al paso 2
  async function enviarUsuario(e) {
    e.preventDefault()
    if (await pedirCodigo()) setPaso('codigo')
  }

  // Reenvío: el código anterior queda invalidado, así que se borra el campo
  async function reenviar() {
    if (await pedirCodigo()) setDatos((previo) => ({ ...previo, codigo: '' }))
  }

  // Paso 2: solo se revisa el formato; el backend lo valida junto con la nueva clave
  function enviarCodigo(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(datos.codigo)) {
      setErrores({ codigo: 'El código tiene 6 dígitos' })
      return
    }
    setErrores({})
    setErroresServidor([])
    setPaso('password')
  }

  // Paso 3: nueva contraseña y confirmación. El backend valida el código y la clave.
  async function enviarPassword(e) {
    e.preventDefault()
    const encontrados = {}
    if (datos.passwordNueva.length < 8 || datos.passwordNueva.length > 72) {
      encontrados.passwordNueva = 'Debe tener entre 8 y 72 caracteres'
    }
    if (!datos.confirmacionPassword) encontrados.confirmacionPassword = 'Este campo es obligatorio'
    else if (datos.confirmacionPassword !== datos.passwordNueva) {
      encontrados.confirmacionPassword = 'No coincide con la contraseña'
    }
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setErroresServidor([])
    setEnviando(true)
    try {
      await llamarApi('/api/auth/recuperar/restablecer', {
        metodo: 'POST',
        cuerpo: {
          nombreUsuario: datos.nombreUsuario.trim(),
          codigo: datos.codigo,
          passwordNueva: datos.passwordNueva,
          confirmacionPassword: datos.confirmacionPassword,
        },
      })
      onTerminado()
    } catch (error) {
      // Código incorrecto, vencido, usado o sin intentos: el backend responde lo mismo
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  function atras() {
    setErrores({})
    setErroresServidor([])
    setPaso(paso === 'password' ? 'codigo' : 'usuario')
  }

  const alEnviar = { usuario: enviarUsuario, codigo: enviarCodigo, password: enviarPassword }[paso]

  return (
    <section>
      <h2>Recuperar contraseña</h2>
      <p>Paso {numeroPaso} de 3</p>

      <form noValidate onSubmit={alEnviar}>
        {paso === 'usuario' && (
          <>
            <p>Ingrese su usuario. Enviaremos un código de verificación al correo registrado.</p>
            <Campo etiqueta="Usuario" nombre="nombreUsuario" valor={datos.nombreUsuario}
              onCambio={cambiar} autoComplete="username" error={errores.nombreUsuario} />
          </>
        )}

        {paso === 'codigo' && (
          <>
            {info && <div className="info" role="status">{info}</div>}
            <Campo etiqueta="Código de verificación" nombre="codigo" valor={datos.codigo}
              onCambio={soloDigitos(cambiar)} inputMode="numeric" maxLength={6} autoComplete="one-time-code"
              ayuda="Código de 6 dígitos. Vence a los 10 minutos." error={errores.codigo} />
          </>
        )}

        {paso === 'password' && (
          <>
            <p>Usuario: <strong>{datos.nombreUsuario.trim()}</strong></p>
            <Campo etiqueta="Nueva contraseña" nombre="passwordNueva" tipo="password" valor={datos.passwordNueva}
              onCambio={cambiar} autoComplete="new-password" error={errores.passwordNueva} />
            <Campo etiqueta="Confirmar nueva contraseña" nombre="confirmacionPassword" tipo="password"
              valor={datos.confirmacionPassword} onCambio={cambiar} autoComplete="new-password"
              error={errores.confirmacionPassword} />
          </>
        )}

        {erroresServidor.length > 0 && (
          <div className="alerta" role="alert">
            <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}

        <div className="acciones">
          {paso === 'usuario' ? (
            <button type="button" onClick={onVolver} disabled={enviando}>Volver a iniciar sesión</button>
          ) : (
            <button type="button" onClick={atras} disabled={enviando}>Atrás</button>
          )}

          {paso === 'codigo' && (
            <button type="button" onClick={reenviar} disabled={enviando || restantes > 0}>
              {restantes > 0 ? `Reenviar código (${restantes} s)` : 'Reenviar código'}
            </button>
          )}

          {/* Desactivado mientras envía: evita pedir o cambiar dos veces con un doble clic */}
          <button type="submit" disabled={enviando}>
            {paso === 'usuario' && (enviando ? 'Enviando…' : 'Enviar código')}
            {paso === 'codigo' && 'Continuar'}
            {paso === 'password' && (enviando ? 'Cambiando…' : 'Cambiar contraseña')}
          </button>
        </div>
      </form>
    </section>
  )
}