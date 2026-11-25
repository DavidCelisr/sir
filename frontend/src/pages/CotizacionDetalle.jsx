import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useSesion } from '../auth/SesionContext.jsx'
import { ETIQUETAS_TIPO_LINEA } from '../constants/cotizaciones.js'
import { TIPOS_DOCUMENTO } from '../constants/tiposDocumento.js'
import { pesos } from '../utils/formato.js'

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' })
const etiquetaTipo = (valor) => TIPOS_DOCUMENTO.find((t) => t.valor === valor)?.etiqueta ?? valor

// Detalle de una cotización. Es la vista que se imprime: al imprimir
// se ocultan la cabecera y los botones (clase "no-imprimir") y la nota del IVA
// vienen del backend, así la impresión y el correo muestran exactamente lo mismo.
export default function CotizacionDetalle() {
  const { id } = useParams()
  const { llamar, empresa } = useSesion()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const [aviso, setAviso] = useState(ubicacion.state?.aviso ?? '') // "La cotización COT-… fue creada."
  const [cotizacion, setCotizacion] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'no-existe' | 'error'
  const [version, setVersion] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState(null) // { tipo: 'exito' | 'error', texto }

  // El aviso viaja en el estado de la navegación, que sobrevive a una recarga:
  // una vez leído se borra, para que no reaparezca al pulsar F5.
  useEffect(() => {
    if (ubicacion.state?.aviso) navegar(ubicacion.pathname, { replace: true, state: null })
  }, [ubicacion, navegar])

  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    llamar(`/api/portal/cotizaciones/${id}`)
      .then((respuesta) => {
        if (!activo) return
        setCotizacion(respuesta)
        setCarga('listo')
      })
      // 404 (no existe o es de otra empresa) y 400 (id que no es un número) se tratan igual
      .catch((error) => { if (activo) setCarga(error.estado === 404 || error.estado === 400 ? 'no-existe' : 'error') })
    return () => { activo = false }
  }, [llamar, id, version])

  // El título de la pestaña es lo que el navegador escribe en el encabezado de la impresión y propone
  // como nombre del archivo PDF: "SIR COT + CODIGO. Al salir de la pantalla se restaura.
  // Debe ir antes de los "return" de más abajo: los hooks no pueden ejecutarse de forma condicional.
  useEffect(() => {
    if (!cotizacion) return
    const anterior = document.title
    document.title = `SIR ${cotizacion.codigo}`
    return () => { document.title = anterior }
  }, [cotizacion])

  // Envía la cotización al correo del cliente (simulado). No deja registro: la cotización no tiene estados
  async function enviar() {
    setEnviando(true)
    setResultadoEnvio(null)
    try {
      const respuesta = await llamar(`/api/portal/cotizaciones/${id}/enviar`, { metodo: 'POST' })
      setResultadoEnvio({ tipo: 'exito', texto: `Cotización enviada a ${respuesta.destino}.` })
    } catch (error) {
      setResultadoEnvio({ tipo: 'error', texto: error.message })
    } finally {
      setEnviando(false)
    }
  }

  if (carga === 'cargando') return <section><p>Cargando cotización…</p></section>

  if (carga === 'no-existe') {
    return (
      <section>
        <h1>Cotización no encontrada</h1>
        <p>La cotización no existe o no pertenece a su empresa.</p>
        <Link to="/cotizaciones">Volver al listado</Link>
      </section>
    )
  }

  if (carga === 'error') {
    return (
      <section>
        <div className="alerta" role="alert">
          No se pudo cargar la cotización. <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
        <Link to="/cotizaciones">Volver al listado</Link>
      </section>
    )
  }

  const c = cotizacion
  const tieneCorreo = Boolean(c.cliente.correo)

  return (
    <section>
      {/* Todo lo que lleva "no-imprimir" desaparece al imprimir o guardar como PDF */}
      <div className="no-imprimir">
        {aviso && <div className="exito" role="status">{aviso}</div>}

        <div className="acciones-cotizacion">
          <Link to="/cotizaciones">Volver al listado</Link>
          {/* El PDF sale de "Guardar como PDF" del diálogo de impresión del navegador */}
          <button type="button" onClick={() => window.print()}>Imprimir o guardar como PDF</button>
          <button type="button" disabled={!tieneCorreo || enviando} onClick={enviar}>
            {enviando ? 'Enviando…' : 'Enviar al cliente'}
          </button>
        </div>

        {!tieneCorreo && (
          <p><small>El cliente no tiene correo registrado. Imprima la cotización o guárdela como PDF para entregársela (por ejemplo, por WhatsApp).</small></p>
        )}
        {resultadoEnvio?.tipo === 'exito' && <div className="exito" role="status">{resultadoEnvio.texto}</div>}
        {resultadoEnvio?.tipo === 'error' && <div className="alerta" role="alert">{resultadoEnvio.texto}</div>}
      </div>

      <article className="documento-cotizacion">
        <h1>Cotización {c.codigo}</h1>
        <p><strong>{empresa.nombre}</strong></p>
        <p>Fecha: {FECHA.format(new Date(c.fecha))} · Elaborada por: {c.creadaPor}</p>

        <h2>Cliente</h2>
        <dl className="info-cuenta">
          <dt>Nombre</dt>
          <dd>{c.cliente.nombre}</dd>
          <dt>Documento</dt>
          <dd>{etiquetaTipo(c.cliente.tipoDocumento)} {c.cliente.numeroDocumento}</dd>
          {/* Solo se muestran los datos que el cliente tiene registrados */}
          {c.cliente.correo && (<><dt>Correo</dt><dd>{c.cliente.correo}</dd></>)}
          {c.cliente.telefono && (<><dt>Teléfono</dt><dd>{c.cliente.telefono}</dd></>)}
          {c.cliente.departamento && (<><dt>Departamento de residencia</dt><dd>{c.cliente.departamento}</dd></>)}
          {c.cliente.ciudad && (<><dt>Ciudad de residencia</dt><dd>{c.cliente.ciudad}</dd></>)}
          {c.cliente.direccion && (<><dt>Dirección</dt><dd>{c.cliente.direccion}</dd></>)}
        </dl>

        <h2>Servicio</h2>
        <dl className="info-cuenta">
          {/* Solo la ciudad: el departamento solo ayudó a elegirla y no se guarda */}
          <dt>Ciudad del servicio</dt>
          <dd>{c.ciudadServicio}</dd>
        </dl>

        <h2>Diagnóstico</h2>
        <p className="texto-libre">{c.diagnostico}</p>

        <h2>Detalle</h2>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th className="num">Valor unitario</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {c.lineas.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.descripcion}
                    <small className="detalle-linea">
                      {ETIQUETAS_TIPO_LINEA[l.tipo]}{l.codigo ? ` · Código ${l.codigo}` : ''}
                    </small>
                  </td>
                  <td>{l.cantidad}</td>
                  <td className="num">{pesos(l.precioUnitario)}</td>
                  <td className="num">{pesos(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>Total estimado</th>
                <td className="num"><strong>{pesos(c.total)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p><small>{c.notaIva}</small></p>

        {/* Texto legal: completo y sin cambios, tal como lo devuelve el backend */}
        <p className="texto-legal">{c.textoLegal}</p>
      </article>
    </section>
  )
}