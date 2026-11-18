import { useState } from 'react'
import { Navigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import EstadoSesion from '../components/EstadoSesion.jsx'
import FormularioLogin from './portal/FormularioLogin.jsx'
import FormularioCrearUsuario from './portal/FormularioCrearUsuario.jsx'

// Pantalla 2: portal de ingreso y creación del usuario, dos pestañas. Solo se dibuja la activa, así los campos nunca se repiten en la página.
export default function Portal() {
  const { estado, aviso, reintentar } = useSesion()
  const [pestana, setPestana] = useState('ingreso') // 'ingreso' | 'crear'
  const [mensajeCreado, setMensajeCreado] = useState('')

  // Con sesión válida no tiene sentido ver el login
  if (estado === 'autenticado') return <Navigate to="/inicio" replace />
  if (estado === 'verificando' || estado === 'sin-conexion') {
    return <EstadoSesion estado={estado} reintentar={reintentar} />
  }

  // Al crear el usuario se pasa a la pestaña de ingreso con un mensaje de éxito
  const alCrear = (nombreUsuario) => {
    setMensajeCreado(`El usuario ${nombreUsuario} fue creado. Enviamos la confirmación al correo registrado. Ya puede iniciar sesión.`)
    setPestana('ingreso')
  }

  return (
    <main>
      <h1>Portal SIR</h1>

      <div className="pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'ingreso'}
          onClick={() => setPestana('ingreso')}>Iniciar sesión</button>
        <button type="button" role="tab" aria-selected={pestana === 'crear'}
          onClick={() => { setPestana('crear'); setMensajeCreado('') }}>Crear usuario</button>
      </div>

      {/* Aviso si la sesión terminó (vencida o inválida) */}
      {aviso && <div className="alerta" role="alert">{aviso}</div>}
      {mensajeCreado && <div className="exito" role="status">{mensajeCreado}</div>}

      {pestana === 'ingreso' ? <FormularioLogin /> : <FormularioCrearUsuario onCreado={alCrear} />}
    </main>
  )
}