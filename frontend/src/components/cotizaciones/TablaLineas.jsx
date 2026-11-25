import { ETIQUETAS_TIPO_LINEA, LIMITE_CANTIDAD, NOTA_IVA } from '../../constants/cotizaciones.js'
import { cantidadValida, deCentavos, subtotalDe, totalDe } from '../../utils/importes.js'
import { numero, pesos } from '../../utils/formato.js'

// Líneas de la cotización mientras se arma: la cantidad de las piezas se puede corregir y cualquier
// línea se puede quitar. El total es una VISTA PREVIA: el servidor calcula el definitivo.
export default function TablaLineas({ lineas, error, onCantidad, onQuitar }) {
  if (lineas.length === 0) {
    return (
      <>
        <p>Todavía no hay piezas ni servicios en la cotización.</p>
        {error && <small className="error" role="alert">{error}</small>}
      </>
    )
  }

  return (
    <>
      <div className="tabla-contenedor">
        <table className="tabla tabla-lineas">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th className="num">Valor unitario</th>
              <th className="num">Subtotal</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => {
              const subtotal = subtotalDe(l)
              return (
                <tr key={l.clave}>
                  <td>
                    {l.descripcion}
                    <small className="detalle-linea">
                      {ETIQUETAS_TIPO_LINEA[l.tipo]}{l.codigo ? ` · Código ${l.codigo}` : ''}
                    </small>
                  </td>
                  <td>
                    {l.tipo === 'PIEZA' ? (
                      <input type="text" inputMode="numeric" maxLength={5} className="cantidad"
                        aria-label={`Cantidad de ${l.descripcion}`} aria-invalid={!cantidadValida(l.cantidad)}
                        value={l.cantidad}
                        onChange={(e) => onCantidad(l.clave, e.target.value.replace(/\D/g, ''))} />
                    ) : '1'}
                  </td>
                  <td className="num">{pesos(l.precioUnitario)}</td>
                  <td className="num">{subtotal === null ? '—' : pesos(deCentavos(subtotal))}</td>
                  <td>
                    <button type="button" aria-label={`Quitar ${l.descripcion}`} onClick={() => onQuitar(l.clave)}>Quitar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>Total estimado (sin IVA)</th>
              <td className="num"><strong>{pesos(deCentavos(totalDe(lineas)))}</strong></td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p><small>{NOTA_IVA}. Cantidad de piezas: de 1 a {numero(LIMITE_CANTIDAD)}.</small></p>
      {error && <small className="error" role="alert">{error}</small>}
    </>
  )
}