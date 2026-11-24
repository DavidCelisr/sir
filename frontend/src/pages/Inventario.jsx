import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import PiezaDialogo from '../components/inventario/PiezaDialogo.jsx'
import { numero } from '../utils/formato.js'

// Inventario: Administrador y Técnico Líder. El listado trae solo código, nombre y
// unidades. Al seleccionar una pieza se abre una ventana pequeña con Detalles e Historial.
// los permisos reales los aplica el backend.
export default function Inventario() {
  const { llamar } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const [texto, setTexto] = useState('') // lo que se está escribiendo en el buscador
  const [busqueda, setBusqueda] = useState('') // la búsqueda que ya se aplicó
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [version, setVersion] = useState(0) // sube para volver a pedir el listado
  const [seleccionada, setSeleccionada] = useState(null) // id de la pieza abierta en la ventana
  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '') // aviso de "pieza agregada"

  // El aviso viaja en el estado de la navegación, que sobrevive a una recarga:
  // una vez leído se borra, para que no reaparezca al pulsar F5.
  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname, { replace: true, state: null })
  }, [ubicacion, navegar])

  // Pide el listado al abrir la pantalla, al buscar, al cambiar de página o al subir 'version'
  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    const consulta = new URLSearchParams({ pagina: String(pagina) })
    if (busqueda) consulta.set('busqueda', busqueda)

    llamar(`/api/portal/inventario?${consulta}`)
      .then((respuesta) => {
        if (!activo) return
        // Si se eliminó la última pieza de la última página, se retrocede a la última que existe
        if (respuesta.piezas.length === 0 && pagina > 1) {
          setPagina(respuesta.totalPaginas)
          return
        }
        setDatos(respuesta)
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, busqueda, pagina, version])

  // La búsqueda se aplica con Enter o con el botón, no en cada tecla
  function buscar(e) {
    e.preventDefault()
    setPagina(1)
    setBusqueda(texto.trim())
  }

  function limpiar() {
    setTexto('')
    setBusqueda('')
    setPagina(1)
  }

  const recargar = () => setVersion((v) => v + 1)

  return (
    <section>
      <h1>Inventario</h1>

      {aviso && <div className="exito" role="status">{aviso}</div>}

      {/* Antes del listado: Agregar pieza y el buscador */}
      <div className="barra-listado">
        <Link to="/inventario/nueva" className="boton-enlace">Agregar pieza</Link>

        <form onSubmit={buscar} className="buscador" role="search">
          <label htmlFor="busqueda">Buscar por nombre o código</label>
          <input id="busqueda" type="search" value={texto} maxLength={60} autoComplete="off"
            onChange={(e) => setTexto(e.target.value)} />
          <button type="submit">Buscar</button>
          {busqueda && <button type="button" onClick={limpiar}>Limpiar búsqueda</button>}
        </form>
      </div>

      {carga === 'cargando' && <p>Cargando inventario…</p>}

      {carga === 'error' && (
        <div className="alerta" role="alert">
          No se pudo cargar el inventario. <button type="button" onClick={recargar}>Reintentar</button>
        </div>
      )}

      {carga === 'listo' && datos.piezas.length === 0 && (
        <p>
          {busqueda
            ? `No hay piezas que coincidan con «${busqueda}».`
            : 'Todavía no hay piezas en el inventario. Use «Agregar pieza».'}
        </p>
      )}

      {carga === 'listo' && datos.piezas.length > 0 && (
        <>
          <p>
            {datos.total} {datos.total === 1 ? 'pieza' : 'piezas'}
            {busqueda && ` para «${busqueda}»`}
          </p>

          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Unidades</th>
                </tr>
              </thead>
              <tbody>
                {datos.piezas.map((p) => (
                  // Se puede seleccionar con un clic en la fila o con el botón del nombre (teclado)
                  <tr key={p.id} className="fila-pieza" onClick={() => setSeleccionada(p.id)}>
                    <td>{p.codigo ?? '—'}</td>
                    <td>
                      <button type="button" className="enlace" onClick={() => setSeleccionada(p.id)}>{p.nombre}</button>
                    </td>
                    <td>
                      {numero(p.unidades)}
                      {/* Texto y no solo color: se entiende sin depender de verlo */}
                      {p.bajoMinimo && <strong> · Bajo el mínimo</strong>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {datos.totalPaginas > 1 && (
            <nav aria-label="Paginación" className="paginacion">
              <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span>Página {datos.pagina} de {datos.totalPaginas}</span>
              <button type="button" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
            </nav>
          )}
        </>
      )}

      <PiezaDialogo
        piezaId={seleccionada}
        onCerrar={() => setSeleccionada(null)}
        onCambio={recargar}
        onEliminada={(nombre) => {
          setSeleccionada(null)
          setAviso(`La pieza ${nombre} fue eliminada.`)
          recargar()
        }}
      />
    </section>
  )
}