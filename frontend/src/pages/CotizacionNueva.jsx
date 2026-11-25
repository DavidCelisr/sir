import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Campo from '../components/Campo.jsx'
import DatosCliente from '../components/cotizaciones/DatosCliente.jsx'
import BuscadorPiezas from '../components/cotizaciones/BuscadorPiezas.jsx'
import FormularioServicio from '../components/cotizaciones/FormularioServicio.jsx'
import TablaLineas from '../components/cotizaciones/TablaLineas.jsx'
import { useSesion } from '../auth/SesionContext.jsx'
import { LIMITE_CANTIDAD, LIMITE_DIAGNOSTICO, LIMITE_LINEAS } from '../constants/cotizaciones.js'
import { DOCUMENTO_VALIDO, MSG_DOCUMENTO, normalizarDocumento } from '../utils/documento.js'
import { cantidadValida } from '../utils/importes.js'
import { numero } from '../utils/formato.js'
import CamposUbicacion from '../components/CamposUbicacion.jsx'

const DOCUMENTO_INICIAL = { tipoDocumento: '', numeroDocumento: '' }
const NUEVO_INICIAL = { nombre: '', correo: '', telefono: '', departamentoResidencia: '', ciudad: '', direccion: '' } // departamentoResidencia solo sirve para elegir la ciudad: NO se envía ni se guarda
const MSG_LIMITE_LINEAS = `Una cotización admite hasta ${LIMITE_LINEAS} líneas.`
const OBLIGATORIO = 'Este campo es obligatorio'

// Revisa el formato antes de enviar. El backend siempre vuelve a validar.
// Los largos máximos los impone el atributo maxLength de cada campo.
function validar({ documento, estadoCliente, nuevo, servicio, lineas }) {
  const errores = {}

  if (!documento.tipoDocumento) errores.tipoDocumento = OBLIGATORIO
  if (!DOCUMENTO_VALIDO.test(normalizarDocumento(documento.numeroDocumento))) errores.numeroDocumento = MSG_DOCUMENTO

  // El cliente debe haberse buscado: así se sabe si existe o es nuevo
  if (!errores.tipoDocumento && !errores.numeroDocumento && estadoCliente !== 'existente' && estadoCliente !== 'nuevo') {
    errores.cliente = 'Busque al cliente con «Buscar cliente» antes de continuar'
  }

  if (estadoCliente === 'nuevo') {
    if (!nuevo.nombre.trim()) errores.nombre = OBLIGATORIO
    const correo = nuevo.correo.trim()
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.correo = 'El correo no tiene un formato válido'
    const telefono = nuevo.telefono.trim()
    if (telefono && !/^[0-9+()\s-]{7,20}$/.test(telefono)) errores.telefono = 'El teléfono no tiene un formato válido'
    // Los dos campos son opcionales, pero un departamento sin ciudad se descartaría en silencio
    if (nuevo.departamentoResidencia && !nuevo.ciudad) {
      errores.ciudad = 'Elija la ciudad o deje el departamento sin seleccionar'
    }
  }

  if (!servicio.departamentoServicio) errores.departamentoServicio = OBLIGATORIO
  if (!servicio.ciudadServicio) errores.ciudadServicio = OBLIGATORIO
  if (!servicio.diagnostico.trim()) errores.diagnostico = OBLIGATORIO

  if (lineas.length === 0) {
    errores.lineas = 'Agregue al menos una pieza o un servicio'
  } else if (lineas.some((l) => l.tipo === 'PIEZA' && !cantidadValida(l.cantidad))) {
    errores.lineas = `Revise las cantidades: deben estar entre 1 y ${numero(LIMITE_CANTIDAD)}`
  }
  return errores
}

// Nueva cotización. Una vez creada no se puede modificar ni
// eliminar. El borrador NO se guarda: recargar o salir de la pantalla lo pierde.
export default function CotizacionNueva() {
  const { llamar } = useSesion()
  const navegar = useNavigate()

  // Cliente
  const [documento, setDocumento] = useState(DOCUMENTO_INICIAL)
  const [estadoCliente, setEstadoCliente] = useState('sin-buscar') // 'sin-buscar' | 'buscando' | 'existente' | 'nuevo'
  const [clienteExistente, setClienteExistente] = useState(null)
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [nuevo, setNuevo] = useState(NUEVO_INICIAL)
  const consultaCliente = useRef(0) // descarta respuestas atrasadas

  // Servicio y líneas
  const [servicio, setServicio] = useState({ departamentoServicio: '', ciudadServicio: '', diagnostico: '' })
  const [lineas, setLineas] = useState([])
  const siguienteClave = useRef(1)

  // Envío
  const [errores, setErrores] = useState({})
  const [erroresServidor, setErroresServidor] = useState([])
  const [conflicto, setConflicto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Al cambiar el documento, el cliente mostrado ya no corresponde: se invalida cualquier búsqueda
  // en curso o ya hecha, y se descartan los datos que se hubieran escrito para un cliente nuevo.
  function cambiarDocumento(e) {
    const { name, value } = e.target
    setDocumento((previo) => ({ ...previo, [name]: value }))
    consultaCliente.current += 1
    setEstadoCliente('sin-buscar')
    setClienteExistente(null)
    setErrorBusqueda('')
    setNuevo(NUEVO_INICIAL)
  }

  const cambiarNuevo = (e) => {
    const { name, value } = e.target
    setNuevo((previo) => ({
      ...previo,
      [name]: value,
      // Al cambiar el departamento, la ciudad elegida ya no corresponde
      ...(name === 'departamentoResidencia' ? { ciudad: '' } : {}),
    }))
  }
  const cambiarServicio = (e) => {
    const { name, value } = e.target
    setServicio((previo) => ({
      ...previo,
      [name]: value,
      // Al cambiar el departamento, la ciudad elegida ya no corresponde
      ...(name === 'departamentoServicio' ? { ciudadServicio: '' } : {}),
    }))
  }

  // Recupera al cliente por documento (GET /api/portal/clientes/por-documento).
  // Un 404 NO es un error: significa que es un cliente nuevo.
  async function buscarCliente() {
    const numeroDoc = normalizarDocumento(documento.numeroDocumento)
    const encontrados = {}
    if (!documento.tipoDocumento) encontrados.tipoDocumento = OBLIGATORIO
    if (!DOCUMENTO_VALIDO.test(numeroDoc)) encontrados.numeroDocumento = MSG_DOCUMENTO
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const turno = ++consultaCliente.current
    setEstadoCliente('buscando')
    setErrorBusqueda('')
    try {
      const consulta = new URLSearchParams({ tipoDocumento: documento.tipoDocumento, numeroDocumento: numeroDoc })
      const ficha = await llamar(`/api/portal/clientes/por-documento?${consulta}`)
      if (turno !== consultaCliente.current) return
      setClienteExistente(ficha)
      setEstadoCliente('existente')
    } catch (error) {
      if (turno !== consultaCliente.current) return
      if (error.estado === 404) {
        setEstadoCliente('nuevo')
      } else {
        setEstadoCliente('sin-buscar')
        setErrorBusqueda(error.message)
      }
    }
  }

  // Cada función de agregar devuelve un mensaje de error, o null si se agregó
  function agregarPieza(pieza, cantidad) {
    // La misma pieza con el mismo precio se suma en una sola línea
    const repetida = lineas.find(
      (l) => l.tipo === 'PIEZA' && l.piezaId === pieza.id && l.precioUnitario === pieza.precioUnitario,
    )
    if (repetida) {
      const suma = Number(repetida.cantidad) + cantidad
      if (suma > LIMITE_CANTIDAD) {
        return `La cantidad de «${pieza.nombre}» no puede pasar de ${numero(LIMITE_CANTIDAD)}.`
      }
      setLineas((previo) => previo.map((l) => (l.clave === repetida.clave ? { ...l, cantidad: String(suma) } : l)))
      return null
    }
    if (lineas.length >= LIMITE_LINEAS) return MSG_LIMITE_LINEAS
    setLineas((previo) => [
      ...previo,
      {
        clave: siguienteClave.current++, tipo: 'PIEZA', piezaId: pieza.id, codigo: pieza.codigo,
        descripcion: pieza.nombre, cantidad: String(cantidad), precioUnitario: pieza.precioUnitario,
      },
    ])
    return null
  }

  function agregarServicio({ tipo, descripcion, valor }) {
    if (lineas.length >= LIMITE_LINEAS) return MSG_LIMITE_LINEAS
    setLineas((previo) => [
      ...previo,
      { clave: siguienteClave.current++, tipo, piezaId: null, codigo: null, descripcion, cantidad: '1', precioUnitario: valor },
    ])
    return null
  }

  const cambiarCantidad = (clave, valor) =>
    setLineas((previo) => previo.map((l) => (l.clave === clave ? { ...l, cantidad: valor } : l)))
  const quitarLinea = (clave) => setLineas((previo) => previo.filter((l) => l.clave !== clave))

  async function crear() {
    setErroresServidor([])
    setConflicto(false)

    const encontrados = validar({ documento, estadoCliente, nuevo, servicio, lineas })
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const numeroDoc = normalizarDocumento(documento.numeroDocumento)
    // Con un cliente existente NO se envían datos personales: el servidor copia los almacenados
    const cliente = estadoCliente === 'existente'
      ? { tipoDocumento: documento.tipoDocumento, numeroDocumento: numeroDoc }
      : {
          tipoDocumento: documento.tipoDocumento,
          numeroDocumento: numeroDoc,
          nombre: nuevo.nombre,
          correo: nuevo.correo,
          telefono: nuevo.telefono,
          departamento: nuevo.departamentoResidencia, // si se diligencia, viaja junto con la ciudad
          ciudad: nuevo.ciudad,
          direccion: nuevo.direccion,
        }

    setEnviando(true) // desactiva el botón: evita crear dos cotizaciones con un doble clic
    try {
      const creada = await llamar('/api/portal/cotizaciones', {
        metodo: 'POST',
        cuerpo: {
          cliente,
          ciudadServicio: servicio.ciudadServicio,
          diagnostico: servicio.diagnostico,
          lineas: lineas.map((l) => (l.tipo === 'PIEZA'
            ? { tipo: 'PIEZA', piezaId: l.piezaId, cantidad: Number(l.cantidad), precioUnitario: l.precioUnitario }
            : { tipo: l.tipo, descripcion: l.descripcion, valor: l.precioUnitario })),
        },
      })
      // El aviso viaja en el estado de la navegación y se borra al leerlo
      navegar(`/cotizaciones/${creada.id}`, {
        state: { aviso: `La cotización ${creada.codigo} fue creada.${creada.clienteNuevo ? ' El cliente fue registrado.' : ''}` },
      })
    } catch (error) {
      // 409: el precio de una pieza cambió o la pieza ya no está disponible. Lo escrito se conserva.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
      setConflicto(error.estado === 409)
    } finally {
      setEnviando(false)
    }
  }

  const hayErrores = Object.keys(errores).length > 0

  return (
    <section>
      <h1>Nueva cotización</h1>

      {/* No hay un <form> que envuelva todo: un Enter en cualquier campo no debe crear la cotización.
          Se crea solo con el botón del final. */}
      <div>
        <DatosCliente
          documento={documento} nuevo={nuevo} estado={estadoCliente} existente={clienteExistente}
          errores={errores} errorBusqueda={errorBusqueda}
          onCambioDocumento={cambiarDocumento} onCambioNuevo={cambiarNuevo} onBuscar={buscarCliente}
        />

        <section className="bloque" aria-labelledby="titulo-servicio">
          <h2 id="titulo-servicio">Servicio</h2>
          {/* departamentoResidencia se envía como "departamento" junto con la ciudad, y se guarda ambos */}
          <CamposUbicacion
            datos={servicio} errores={errores} onCambio={cambiarServicio}
            nombreDepartamento="departamentoServicio" nombreCiudad="ciudadServicio"
            etiquetaDepartamento="Departamento del servicio" etiquetaCiudad="Ciudad del servicio"
            ayudaCiudad="Ciudad donde se prestará el servicio. Puede ser distinta de la ciudad de residencia del cliente."
          />
          <Campo etiqueta="Diagnóstico" nombre="diagnostico" multilinea valor={servicio.diagnostico}
            onCambio={cambiarServicio} maxLength={LIMITE_DIAGNOSTICO}
            ayuda={`${numero(servicio.diagnostico.length)} de ${numero(LIMITE_DIAGNOSTICO)} caracteres`}
            error={errores.diagnostico} />
        </section>

        <section className="bloque" aria-labelledby="titulo-lineas">
          <h2 id="titulo-lineas">Piezas y servicios</h2>
          <h3>Agregar una pieza del inventario</h3>
          <BuscadorPiezas onAgregar={agregarPieza} />
          <h3>Agregar un servicio</h3>
          <FormularioServicio onAgregar={agregarServicio} />
          <h3>Detalle de la cotización</h3>
          <TablaLineas lineas={lineas} error={errores.lineas} onCantidad={cambiarCantidad} onQuitar={quitarLinea} />
        </section>

        <p>Una vez creada, la cotización no se puede modificar ni eliminar.</p>

        {hayErrores && <div className="alerta" role="alert">Revise los campos marcados.</div>}
        {erroresServidor.length > 0 && (
          <div className="alerta" role="alert">
            <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {conflicto && (
          <p>Quite la línea afectada y vuelva a agregarla desde el buscador para ver el valor vigente.</p>
        )}

        <div className="acciones">
          <Link to="/cotizaciones">Cancelar</Link>
          <button type="button" onClick={crear} disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear cotización'}
          </button>
        </div>
      </div>
    </section>
  )
}