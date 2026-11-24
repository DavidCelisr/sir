import { useEffect, useRef, useState } from 'react'
import { useSesion } from '../../auth/SesionContext.jsx'
import { ETIQUETA_PRECIO } from '../../constants/inventario.js'
import { numero, pesos } from '../../utils/formato.js'
import AjustarExistencias from './AjustarExistencias.jsx'
import FormularioPieza from './FormularioPieza.jsx'
import HistorialPieza from './HistorialPieza.jsx'

// Vistas que reemplazan a "Detalles" dentro de la misma ventana
const ACCIONES = ['editar', 'ajustar', 'eliminar']
const TITULOS = { editar: 'Editar pieza', ajustar: 'Ajustar existencias', eliminar: 'Eliminar pieza' }

// Los errores del backend llegan como una lista (400) o como un mensaje (409, 404)
const mensajesDe = (error) => (error.errores?.length > 0 ? error.errores : [error.message])

// Ventana modal para consultar y gestionar una pieza, con pestañas de detalles e historial.
// Notifica los cambios o la eliminación para actualizar el listado.
export default function PiezaDialogo({ piezaId, onCerrar, onCambio, onEliminada }) {
  const { llamar } = useSesion()
  const dialogo = useRef(null)
  const titulo = useRef(null)
  const abierto = piezaId !== null

  const [vista, setVista] = useState('detalles') // 'detalles' | 'historial' | 'editar' | 'ajustar' | 'eliminar'
  const [pieza, setPieza] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error' | 'no-existe'
  const [mensaje, setMensaje] = useState('') // aviso de éxito dentro de Detalles
  const [erroresServidor, setErroresServidor] = useState([])
  const [enviando, setEnviando] = useState(false)

  // Se abre y se cierra según 'piezaId'
  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  // Al abrir una pieza se piden sus detalles y se parte siempre de la pestaña Detalles
  useEffect(() => {
    if (piezaId === null) return
    let activo = true // evita actualizar el estado si la ventana ya se cerró
    setVista('detalles')
    setPieza(null)
    setCarga('cargando')
    setMensaje('')
    setErroresServidor([])
    llamar(`/api/portal/inventario/${piezaId}`)
      .then((respuesta) => {
        if (!activo) return
        setPieza(respuesta)
        setCarga('listo')
      })
      .catch((error) => { if (activo) setCarga(error.estado === 404 ? 'no-existe' : 'error') })
    return () => { activo = false }
  }, [llamar, piezaId])

  // El foco pasa al título al abrir y al cambiar de vista: así no se pierde dentro de la ventana
  useEffect(() => {
    if (abierto) titulo.current?.focus()
  }, [abierto, vista, carga])

  function abrirAccion(accion) {
    setMensaje('')
    setErroresServidor([])
    setVista(accion)
  }

  function volverADetalles() {
    setErroresServidor([])
    setVista('detalles')
  }

  // Esc: dentro de una acción vuelve a Detalles; en Detalles o Historial cierra la ventana.
  // Se evita el cierre automático del navegador para que el estado siga siendo la única fuente de verdad.
  function alPulsarEsc(e) {
    e.preventDefault()
    if (enviando) return
    if (ACCIONES.includes(vista)) volverADetalles()
    else onCerrar()
  }

  // Ejecuta una acción contra el backend. 'alTerminar' recibe la respuesta.
  async function ejecutar(ruta, opciones, alTerminar) {
    setEnviando(true)
    setErroresServidor([])
    try {
      alTerminar(await llamar(ruta, opciones))
    } catch (error) {
      // 409: código repetido, stock insuficiente, etc. Lo escrito se conserva para corregirlo.
      setErroresServidor(mensajesDe(error))
      if (error.estado === 404) onCambio() // la pieza ya no existe: se refresca el listado de fondo
    } finally {
      setEnviando(false)
    }
  }

  const guardar = (datos) =>
    ejecutar(`/api/portal/inventario/${piezaId}`, { metodo: 'PATCH', cuerpo: datos }, (actualizada) => {
      setPieza(actualizada)
      setMensaje('Datos de la pieza actualizados.')
      setVista('detalles')
      onCambio()
    })

  const ajustar = (cantidad) =>
    ejecutar(`/api/portal/inventario/${piezaId}/ajuste`, { metodo: 'POST', cuerpo: { cantidad } }, (actualizada) => {
      setPieza(actualizada)
      setMensaje('Existencias ajustadas.')
      setVista('detalles')
      onCambio()
    })

  // Eliminación lógica: la pieza y su historial se conservan en la base de datos
  const eliminar = () =>
    ejecutar(`/api/portal/inventario/${piezaId}`, { metodo: 'DELETE' }, () => onEliminada(pieza.nombre))

  return (
    <dialog ref={dialogo} className="dialogo-pieza" aria-labelledby="titulo-pieza" onCancel={alPulsarEsc}>
      {abierto && (
        <>
          <div className="dialogo-cabecera">
            <div>
              <h2 id="titulo-pieza" ref={titulo} tabIndex={-1}>
                {TITULOS[vista] ?? pieza?.nombre ?? 'Pieza'}
              </h2>
              {pieza && (
                <small>{ACCIONES.includes(vista) ? pieza.nombre : `Código: ${pieza.codigo ?? 'Sin código'}`}</small>
              )}
            </div>
            <button type="button" aria-label="Cerrar" onClick={onCerrar} disabled={enviando}>✕</button>
          </div>

          {carga === 'cargando' && <p>Cargando…</p>}
          {carga === 'error' && <div className="alerta" role="alert">No se pudo cargar la pieza.</div>}
          {carga === 'no-existe' && <div className="alerta" role="alert">La pieza ya no existe.</div>}

          {carga === 'listo' && !ACCIONES.includes(vista) && (
            <>
              <div className="pestanas" role="tablist" aria-label="Información de la pieza">
                <button type="button" role="tab" aria-selected={vista === 'detalles'}
                  onClick={() => { setMensaje(''); setVista('detalles') }}>Detalles</button>
                <button type="button" role="tab" aria-selected={vista === 'historial'}
                  onClick={() => { setMensaje(''); setVista('historial') }}>Historial</button>
              </div>

              <div role="tabpanel">
                {vista === 'historial' ? (
                  <HistorialPieza piezaId={piezaId} />
                ) : (
                  <>
                    {mensaje && <div className="exito" role="status">{mensaje}</div>}

                    <dl className="info-cuenta">
                      <dt>Unidades disponibles</dt>
                      <dd>
                        {numero(pieza.unidades)}
                        {pieza.bajoMinimo && <strong> · Bajo el mínimo</strong>}
                      </dd>
                      <dt>Mínimo en stock</dt>
                      <dd>{numero(pieza.stockMinimo)}</dd>
                      <dt>{ETIQUETA_PRECIO}</dt>
                      <dd>{pesos(pieza.precioUnitario)}</dd>
                    </dl>

                    <div className="acciones">
                      <button type="button" onClick={() => abrirAccion('editar')}>Editar</button>
                      <button type="button" onClick={() => abrirAccion('ajustar')}>Ajustar existencias</button>
                      <button type="button" onClick={() => abrirAccion('eliminar')}>Eliminar</button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {carga === 'listo' && vista === 'editar' && (
            <FormularioPieza
              inicial={{
                codigo: pieza.codigo ?? '',
                nombre: pieza.nombre,
                precioUnitario: pieza.precioUnitario,
                stockMinimo: String(pieza.stockMinimo),
              }}
              textoEnviar="Guardar cambios"
              enviando={enviando}
              erroresServidor={erroresServidor}
              onEnviar={guardar}
              onCancelar={volverADetalles}
            />
          )}

          {carga === 'listo' && vista === 'ajustar' && (
            <AjustarExistencias
              unidadesActuales={pieza.unidades}
              enviando={enviando}
              erroresServidor={erroresServidor}
              onEnviar={ajustar}
              onCancelar={volverADetalles}
            />
          )}

          {carga === 'listo' && vista === 'eliminar' && (
            <>
              <p>¿Está seguro de eliminar {pieza.nombre}?</p>
              <p>Dejará de aparecer en el inventario y no podrá seleccionarse. Su historial y los documentos anteriores se conservan.</p>

              {erroresServidor.length > 0 && (
                <div className="alerta" role="alert">
                  <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}

              <div className="acciones">
                {/* Cancelar va primero: es la opción segura */}
                <button type="button" onClick={volverADetalles} disabled={enviando}>Cancelar</button>
                <button type="button" onClick={eliminar} disabled={enviando}>{enviando ? 'Procesando…' : 'Eliminar'}</button>
              </div>
            </>
          )}
        </>
      )}
    </dialog>
  )
}