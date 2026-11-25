import { useRef, useState } from 'react'
import { useSesion } from '../../auth/SesionContext.jsx'
import { LIMITE_CANTIDAD } from '../../constants/cotizaciones.js'
import { cantidadValida } from '../../utils/importes.js'
import { numero, pesos } from '../../utils/formato.js'

// Busca piezas del inventario activo CON precio (GET /api/portal/cotizaciones/piezas) y permite
// agregarlas a la cotización. No muestra existencias: cotizar no las valida ni las descuenta.
// 'onAgregar(pieza, cantidad)' devuelve un mensaje de error, o null si se agregó.
export default function BuscadorPiezas({ onAgregar }) {
  const { llamar } = useSesion()
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('inicial') // 'inicial' | 'buscando' | 'listo' | 'error'
  const [resultado, setResultado] = useState(null) // { piezas, total, busqueda }
  const [cantidades, setCantidades] = useState({}) // cantidad escrita por pieza (id -> texto)
  const [mensaje, setMensaje] = useState('')
  const turno = useRef(0) // para descartar respuestas atrasadas

  // Es su propio <form>: un Enter aquí busca piezas y no envía la cotización
  async function buscar(e) {
    e.preventDefault()
    const miTurno = ++turno.current
    const busqueda = texto.trim()
    setEstado('buscando')
    setMensaje('')
    try {
      const consulta = new URLSearchParams()
      if (busqueda) consulta.set('busqueda', busqueda)
      const respuesta = await llamar(`/api/portal/cotizaciones/piezas?${consulta}`)
      if (miTurno !== turno.current) return
      setResultado({ ...respuesta, busqueda })
      setEstado('listo')
    } catch {
      if (miTurno === turno.current) setEstado('error')
    }
  }

  function agregar(pieza) {
    const cantidad = cantidades[pieza.id] ?? '1'
    if (!cantidadValida(cantidad)) {
      setMensaje(`La cantidad debe estar entre 1 y ${numero(LIMITE_CANTIDAD)}.`)
      return
    }
    setMensaje(onAgregar(pieza, Number(cantidad)) ?? `Se agregó «${pieza.nombre}».`)
  }

  return (
    <div>
      <form onSubmit={buscar} className="buscador" role="search">
        <label htmlFor="busqueda-piezas">Buscar pieza por nombre o código</label>
        <input id="busqueda-piezas" type="search" value={texto} maxLength={60} autoComplete="off"
          onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {estado === 'inicial' && (
        <p><small>Escriba parte del nombre o del código y pulse Buscar. Sin texto, se muestran las primeras piezas.</small></p>
      )}
      {estado === 'error' && <div className="alerta" role="alert">No se pudieron buscar las piezas. Intente de nuevo.</div>}

      {estado === 'listo' && resultado.piezas.length === 0 && (
        <p>{resultado.busqueda ? `No hay piezas que coincidan con «${resultado.busqueda}».` : 'Todavía no hay piezas en el inventario.'}</p>
      )}

      {estado === 'listo' && resultado.piezas.length > 0 && (
        <>
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Pieza</th>
                  <th className="num">Valor unitario</th>
                  <th>Cantidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {resultado.piezas.map((p) => (
                  <tr key={p.id}>
                    <td>{p.codigo ?? '—'}</td>
                    <td>{p.nombre}</td>
                    <td className="num">{pesos(p.precioUnitario)}</td>
                    <td>
                      <input type="text" inputMode="numeric" maxLength={5} className="cantidad"
                        aria-label={`Cantidad de ${p.nombre}`} value={cantidades[p.id] ?? '1'}
                        onChange={(e) => setCantidades((previo) => ({ ...previo, [p.id]: e.target.value.replace(/\D/g, '') }))} />
                    </td>
                    <td>
                      <button type="button" aria-label={`Agregar ${p.nombre}`} onClick={() => agregar(p)}>Agregar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resultado.total > resultado.piezas.length && (
            <p><small>Hay {numero(resultado.total)} piezas que coinciden; se muestran las primeras {resultado.piezas.length}. Afine la búsqueda.</small></p>
          )}
        </>
      )}

      {mensaje && <p role="status">{mensaje}</p>}
    </div>
  )
}