import { useEffect, useState } from 'react'
import { useSesion } from '../../auth/SesionContext.jsx'
import { ETIQUETA_PRECIO } from '../../constants/inventario.js'
import { fechaHora, numero, pesos } from '../../utils/formato.js'

// Una frase por movimiento. Es el historial propio de la pieza dentro del inventario:
// no incluye casos ni solicitudes.
function describir(m) {
  const precio = ETIQUETA_PRECIO.toLowerCase()
  switch (m.tipo) {
    case 'ALTA':
      return `Alta de la pieza: ${numero(m.unidadesDespues)} unidades, ${precio} ${pesos(m.precioDespues)}`
    case 'AJUSTE': {
      const signo = m.cantidad > 0 ? '+' : '−'
      return `Ajuste de existencias: ${signo}${numero(Math.abs(m.cantidad))} (de ${numero(m.unidadesAntes)} a ${numero(m.unidadesDespues)})`
    }
    case 'CAMBIO_PRECIO':
      return `Cambio de ${precio}: de ${pesos(m.precioAntes)} a ${pesos(m.precioDespues)}`
    default:
      return m.tipo
  }
}

// Historial de la pieza, lo más reciente primero, con paginación. Se pide cada vez que se
// abre la pestaña, así un ajuste o un cambio de precio recién hecho ya aparece.
export default function HistorialPieza({ piezaId }) {
  const { llamar } = useSesion()
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [version, setVersion] = useState(0) // sube para volver a pedir (botón Reintentar)

  useEffect(() => {
    let activo = true // evita actualizar el estado si la ventana ya se cerró
    setCarga('cargando')
    llamar(`/api/portal/inventario/${piezaId}/historial?pagina=${pagina}`)
      .then((respuesta) => {
        if (!activo) return
        setDatos(respuesta)
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, piezaId, pagina, version])

  if (carga === 'cargando') return <p>Cargando historial…</p>
  if (carga === 'error') {
    return (
      <div className="alerta" role="alert">
        No se pudo cargar el historial.{' '}
        <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
      </div>
    )
  }
  if (datos.movimientos.length === 0) return <p>Esta pieza todavía no tiene movimientos.</p>

  return (
    <>
      <ol className="historial">
        {datos.movimientos.map((m) => (
          <li key={m.id}>
            {describir(m)}
            {/* El nombre es el que tenía la persona en ese momento */}
            <small>{fechaHora(m.fecha)} · {m.usuario}</small>
          </li>
        ))}
      </ol>

      {datos.totalPaginas > 1 && (
        <nav aria-label="Paginación del historial" className="paginacion">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {datos.pagina} de {datos.totalPaginas}</span>
          <button type="button" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </nav>
      )}
    </>
  )
}