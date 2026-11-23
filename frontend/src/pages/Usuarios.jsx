import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import DialogoConfirmar from '../components/DialogoConfirmar.jsx'

// Opciones del filtro por rol. Solo para el Administrador: el servidor le devuelve
// al Técnico Líder únicamente Técnicos, así que a él no le sirve filtrar.
const OPCIONES_ROL = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'TECNICO_LIDER', etiqueta: 'Técnico Líder' },
  { valor: 'TECNICO', etiqueta: 'Técnico' },
]

// Gestión de usuarios. Administrador: ve a todos y elimina.
// Técnico Líder: ve solo a los Técnicos y no tiene acciones.
// los permisos reales los aplica el backend.
export default function Usuarios() {
  const { usuario, llamar } = useSesion()
  const esAdmin = usuario.rol === 'ADMINISTRADOR'
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const [usuarios, setUsuarios] = useState([])
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [filtroRol, setFiltroRol] = useState('')
  const [version, setVersion] = useState(0) // sube para volver a pedir la lista
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '') // aviso de "usuario creado"

  const [pendiente, setPendiente] = useState(null) // usuario que se va a eliminar
  const [errorEliminar, setErrorEliminar] = useState('')
  const [eliminando, setEliminando] = useState(false)

  // El aviso viaja en el estado de la navegación, que sobrevive a una recarga:
  // una vez leído se borra, para que no reaparezca al pulsar F5.
  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname, { replace: true, state: null })
  }, [ubicacion, navegar])

  // Pide la lista al abrir la pantalla, al cambiar el filtro o al subir 'version'
  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    const consulta = filtroRol ? `?rol=${filtroRol}` : ''
    llamar(`/api/portal/usuarios${consulta}`)
      .then((lista) => {
        if (!activo) return
        setUsuarios(lista)
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, filtroRol, version])

  function pedirEliminar(u) {
    setErrorEliminar('')
    setPendiente(u)
  }

  function cancelarEliminar() {
    if (!eliminando) setPendiente(null)
  }

  // Eliminación lógica: el backend inactiva al usuario y conserva su historial
  async function confirmarEliminar() {
    setEliminando(true)
    setErrorEliminar('')
    try {
      await llamar(`/api/portal/usuarios/${pendiente.id}`, { metodo: 'DELETE' })
      setAviso(`El usuario ${pendiente.nombre} fue eliminado.`)
      setPendiente(null)
      setVersion((v) => v + 1)
    } catch (error) {
      // Con casos abiertos el backend rechaza (409) y el mensaje se muestra en el mismo diálogo.
      // Si el usuario ya no existe (404), se refresca la lista de fondo.
      setErrorEliminar(error.message)
      if (error.estado === 404) setVersion((v) => v + 1)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <section>
      <h1>Gestión de usuarios</h1>

      {aviso && <div className="exito" role="status">{aviso}</div>}

      {/* Antes del listado: Agregar usuario (Administrador y Técnico Líder) */}
      <div className="barra-listado">
        <Link to="/usuarios/nuevo" className="boton-enlace">Agregar usuario</Link>

        {esAdmin && (
          <div>
            <label htmlFor="filtro-rol">Filtrar por rol </label>
            <select id="filtro-rol" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
              {OPCIONES_ROL.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
            </select>
          </div>
        )}
      </div>

      {carga === 'cargando' && <p>Cargando usuarios…</p>}

      {carga === 'error' && (
        <div className="alerta" role="alert">
          No se pudo cargar el listado.{' '}
          <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
      )}

      {carga === 'listo' && usuarios.length === 0 && <p>No hay usuarios para mostrar.</p>}

      {carga === 'listo' && usuarios.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Correo</th>
                {/* Solo el Administrador tiene acciones; al Líder no se le muestra la columna */}
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombreUsuario}</td>
                  <td>{u.nombre}</td>
                  {/* Solo el número, sin el tipo. Los usuarios anteriores pueden no tener documento */}
                  <td>{u.numeroDocumento ?? 'No registrado'}</td>
                  <td>{u.correo}</td>
                  {esAdmin && (
                    <td>
                      {u.soloLectura ? (
                        'Solo lectura'
                      ) : (
                        <button type="button" aria-label={`Eliminar a ${u.nombre}`} onClick={() => pedirEliminar(u)}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmar
        abierto={pendiente !== null}
        titulo="Eliminar usuario"
        error={errorEliminar}
        enviando={eliminando}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={cancelarEliminar}
      >
        <p>¿Está seguro de eliminar a {pendiente?.nombre}?</p>
        <p>Dejará de aparecer en el listado y no podrá iniciar sesión. Su historial se conserva.</p>
      </DialogoConfirmar>
    </section>
  )
}