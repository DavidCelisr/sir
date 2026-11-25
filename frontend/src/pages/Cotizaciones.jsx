import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { fechaHora, pesos } from '../utils/formato.js'

// Cotizaciones: Administrador y Técnico Líder ven todas las de la
// empresa. Más recientes primero, con búsqueda por número, nombre o documento del cliente, filtro por sede
// (otra forma de consultar, no una restricción) y paginación de 25. UX: los
// permisos reales los aplica el backend.
export default function Cotizaciones() {
  const { llamar } = useSesion()
  const [texto, setTexto] = useState('') // lo que se está escribiendo en el buscador
  const [busqueda, setBusqueda] = useState('') // la búsqueda que ya se aplicó
  const [sedes, setSedes] = useState([]) // sedes ACTIVAS, para el filtro
  const [filtroSede, setFiltroSede] = useState('') // '' = todas
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [version, setVersion] = useState(0) // sube para volver a pedir el listado

  // Las sedes se piden una vez. Si fallara, el filtro simplemente no aparece: el listado sigue funcionando.
  useEffect(() => {
    let activo = true
    llamar('/api/portal/sedes')
      .then((respuesta) => { if (activo) setSedes(respuesta.sedes) })
      .catch(() => {})
    return () => { activo = false }
  }, [llamar])

  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    const consulta = new URLSearchParams({ pagina: String(pagina) })
    if (busqueda) consulta.set('busqueda', busqueda)
    if (filtroSede) consulta.set('sedeId', filtroSede)

    llamar(`/api/portal/cotizaciones?${consulta}`)
      .then((respuesta) => {
        if (!activo) return
        setDatos(respuesta)
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, busqueda, filtroSede, pagina, version])

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

  function cambiarSede(e) {
    setFiltroSede(e.target.value)
    setPagina(1)
  }

  return (
    <section>
      <h1>Cotizaciones</h1>

      {/* Antes del listado: Nueva cotización, el buscador y el filtro por sede */}
      <div className="barra-listado">
        <Link to="/cotizaciones/nueva" className="boton-enlace">Nueva cotización</Link>

        <form onSubmit={buscar} className="buscador" role="search">
          <label htmlFor="busqueda">Buscar por número, nombre o documento</label>
          <input id="busqueda" type="search" value={texto} maxLength={60} autoComplete="off"
            onChange={(e) => setTexto(e.target.value)} />
          <button type="submit">Buscar</button>
          {busqueda && <button type="button" onClick={limpiar}>Limpiar búsqueda</button>}
        </form>

        {/* Con una sola sede el filtro no sirve: solo aparece si hay más de una */}
        {sedes.length > 1 && (
          <div>
            <label htmlFor="filtro-sede">Filtrar por sede </label>
            <select id="filtro-sede" value={filtroSede} onChange={cambiarSede}>
              <option value="">Todas las sedes</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.ciudad}</option>)}
            </select>
          </div>
        )}
      </div>

      {carga === 'cargando' && <p>Cargando cotizaciones…</p>}

      {carga === 'error' && (
        <div className="alerta" role="alert">
          No se pudieron cargar las cotizaciones.{' '}
          <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
      )}

      {carga === 'listo' && datos.cotizaciones.length === 0 && (
        <p>
          {busqueda
            ? `No hay cotizaciones que coincidan con «${busqueda}».`
            : filtroSede
              ? 'No hay cotizaciones de esa sede.'
              : 'Todavía no hay cotizaciones. Use «Nueva cotización».'}
        </p>
      )}

      {carga === 'listo' && datos.cotizaciones.length > 0 && (
        <>
          <p>
            {datos.total} {datos.total === 1 ? 'cotización' : 'cotizaciones'}
            {busqueda && ` para «${busqueda}»`}
          </p>

          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Sede</th>
                  <th className="num">Total</th>
                  <th>Elaborada por</th>
                </tr>
              </thead>
              <tbody>
                {datos.cotizaciones.map((c) => (
                  <tr key={c.id}>
                    {/* Un enlace real: se alcanza con el teclado y se puede abrir en otra pestaña */}
                    <td><Link to={`/cotizaciones/${c.id}`}>{c.codigo}</Link></td>
                    <td>{fechaHora(c.fecha)}</td>
                    <td>{c.cliente}</td>
                    <td>{c.documento}</td>
                    {/* La sede de la fotografía de la cotización; las anteriores a las sedes no tienen */}
                    <td>{c.sede ?? '—'}</td>
                    <td className="num">{pesos(c.total)}</td>
                    <td>{c.creadaPor}</td>
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
    </section>
  )
}