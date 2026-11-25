import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import DialogoConfirmar from '../components/DialogoConfirmar.jsx'

// Gestión de sedes: solo el Administrador. Las sedes identifican a qué ubicación corresponde
// cada cotización y cada caso; no limitan lo que ve ningún usuario. UX: los
// permisos reales los aplica el backend (el Líder solo puede leer la lista, para elegir la sede al cotizar).
export default function Sedes() {
  const { llamar } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const [sedes, setSedes] = useState([])
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [version, setVersion] = useState(0) // sube para volver a pedir la lista
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '') // "La sede … fue agregada."

  // Acción pendiente de confirmar: { tipo: 'principal' | 'eliminar', sede }
  const [accion, setAccion] = useState(null)
  const [errorAccion, setErrorAccion] = useState('')
  const [procesando, setProcesando] = useState(false)

  // El aviso viaja en el estado de la navegación, que sobrevive a una recarga:
  // una vez leído se borra, para que no reaparezca al pulsar F5.
  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname, { replace: true, state: null })
  }, [ubicacion, navegar])

  // Pide la lista al abrir la pantalla y cada vez que sube 'version' (después de cada cambio)
  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    llamar('/api/portal/sedes')
      .then((respuesta) => {
        if (!activo) return
        setSedes(respuesta.sedes)
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, version])

  const principalActual = sedes.find((s) => s.esPrincipal)

  function pedirAccion(tipo, sede) {
    setErrorAccion('')
    setAccion({ tipo, sede })
  }

  function cancelarAccion() {
    if (!procesando) setAccion(null)
  }

  // Designar como principal (intercambio atómico en el backend) o eliminar (inactivación lógica)
  async function confirmarAccion() {
    const { tipo, sede } = accion
    setProcesando(true)
    setErrorAccion('')
    try {
      if (tipo === 'principal') {
        await llamar(`/api/portal/sedes/${sede.id}/principal`, { metodo: 'POST' })
        setAviso(`La sede «${sede.nombre}» ahora es la principal.`)
      } else {
        await llamar(`/api/portal/sedes/${sede.id}`, { metodo: 'DELETE' })
        setAviso(`La sede «${sede.nombre}» fue eliminada.`)
      }
      setAccion(null)
      setVersion((v) => v + 1)
    } catch (error) {
      // El mensaje del backend se muestra en el mismo diálogo (por ejemplo, "casos abiertos").
      // Si la sede ya cambió o desapareció (404, 409), la lista de fondo se actualiza.
      setErrorAccion(error.message)
      if (error.estado === 404 || error.estado === 409) setVersion((v) => v + 1)
    } finally {
      setProcesando(false)
    }
  }

  const esDesignar = accion?.tipo === 'principal'

  return (
    <section>
      <h1>Gestión de sedes</h1>
      <p>Las sedes identifican a qué ubicación corresponde cada cotización y cada caso.</p>

      {aviso && <div className="exito" role="status">{aviso}</div>}

      {/* Antes del listado: Agregar sede */}
      <div className="barra-listado">
        <Link to="/sedes/nueva" className="boton-enlace">Agregar sede</Link>
      </div>

      {carga === 'cargando' && <p>Cargando sedes…</p>}

      {carga === 'error' && (
        <div className="alerta" role="alert">
          No se pudieron cargar las sedes.{' '}
          <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
      )}

      {carga === 'listo' && sedes.length === 0 && <p>No hay sedes para mostrar.</p>}

      {carga === 'listo' && sedes.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Departamento</th>
                <th>Ciudad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.nombre}
                    {/* Texto y no solo color: se entiende sin depender de verlo */}
                    {s.esPrincipal && <span className="etiqueta-principal">Principal</span>}
                  </td>
                  <td>{s.direccion ?? '—'}</td>
                  <td>{s.departamento}</td>
                  <td>{s.ciudad}</td>
                  <td>
                    <div className="acciones-fila">
                      <Link to={`/sedes/${s.id}/editar`} className="boton-enlace"
                        aria-label={`Editar ${s.nombre}`}>Editar</Link>

                      {/* La principal ya lo es: no tiene sentido designarla otra vez */}
                      {!s.esPrincipal && (
                        <button type="button" aria-label={`Designar ${s.nombre} como principal`}
                          onClick={() => pedirAccion('principal', s)}>Designar como principal</button>
                      )}

                      {s.esPrincipal ? (
                        <>
                          {/* La principal no se puede eliminar: la explicación está en texto visible */}
                          <button type="button" disabled aria-describedby={`nota-principal-${s.id}`}>Eliminar</button>
                          <small id={`nota-principal-${s.id}`} className="nota-fila">
                            Designe otra sede como principal para poder eliminarla
                          </small>
                        </>
                      ) : (
                        <button type="button" aria-label={`Eliminar ${s.nombre}`}
                          onClick={() => pedirAccion('eliminar', s)}>Eliminar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmar
        abierto={accion !== null}
        titulo={esDesignar ? 'Designar sede principal' : 'Eliminar sede'}
        error={errorAccion}
        enviando={procesando}
        textoConfirmar={esDesignar ? 'Designar como principal' : 'Eliminar'}
        onConfirmar={confirmarAccion}
        onCancelar={cancelarAccion}
      >
        {esDesignar ? (
          <>
            <p>¿Designar la sede «{accion?.sede.nombre}» como sede principal?</p>
            {principalActual && (
              <p>La sede «{principalActual.nombre}» dejará de ser la principal y seguirá activa como una sede normal.</p>
            )}
          </>
        ) : (
          <>
            <p>¿Está seguro de eliminar la sede «{accion?.sede.nombre}»?</p>
            <p>Dejará de aparecer y de poder elegirse en las cotizaciones. Las cotizaciones y los casos anteriores la conservan.</p>
          </>
        )}
      </DialogoConfirmar>
    </section>
  )
}