import { useState } from 'react'
import { Navigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import EstadoSesion from '../components/EstadoSesion.jsx'
import FormularioLogin from './portal/FormularioLogin.jsx'
import FormularioCrearUsuario from './portal/FormularioCrearUsuario.jsx'
import RecuperarPassword from './portal/RecuperarPassword.jsx'

// Pantalla 2: portal de ingreso, creación del usuario y recuperación de contraseña
// Una sola ruta con tres vistas:
// dos pestañas ("ingreso" y "crear") y el flujo de recuperación, sin pestañas.
export default function Portal() {
  const { estado, aviso, reintentar } = useSesion()
  const [vista, setVista] = useState('ingreso') // 'ingreso' | 'crear' | 'recuperar'
  const [mensaje, setMensaje] = useState('') // aviso de éxito que se muestra en el ingreso

  // Con sesión válida no tiene sentido ver el login
  if (estado === 'autenticado') return <Navigate to="/inicio" replace />
  if (estado === 'verificando' || estado === 'sin-conexion') {
    return <EstadoSesion estado={estado} reintentar={reintentar} />
  }

  // Al crear el usuario se pasa a la pestaña de ingreso con un mensaje de éxito
  const alCrear = (nombreUsuario) => {
    setMensaje(`El usuario ${nombreUsuario} fue creado. Enviamos la confirmación al correo registrado. Ya puede iniciar sesión.`)
    setVista('ingreso')
  }

  // Al cambiar la contraseña se vuelve al ingreso; no se inicia sesión automáticamente
  const alRecuperar = () => {
    setMensaje('Su contraseña fue actualizada. Ya puede iniciar sesión.')
    setVista('ingreso')
  }

  // La recuperación es un flujo aparte: sin pestañas
  if (vista === 'recuperar') {
    return (
      <main>
        <h1>Portal SIR</h1>
        <RecuperarPassword onTerminado={alRecuperar} onVolver={() => setVista('ingreso')} />
      </main>
    )
  }

  return (
    <main>
      <h1>Portal SIR</h1>

      <div className="pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={vista === 'ingreso'}
          onClick={() => setVista('ingreso')}>Iniciar sesión</button>
        <button type="button" role="tab" aria-selected={vista === 'crear'}
          onClick={() => { setVista('crear'); setMensaje('') }}>Crear usuario</button>
      </div>

      {/* Aviso si la sesión terminó (vencida o inválida) */}
      {aviso && <div className="alerta" role="alert">{aviso}</div>}
      {mensaje && <div className="exito" role="status">{mensaje}</div>}

      {vista === 'ingreso'
        ? <FormularioLogin onOlvido={() => { setMensaje(''); setVista('recuperar') }} />
        : <FormularioCrearUsuario onCreado={alCrear} />}
    </main>
  )
}