import { useState } from 'react'
import Campo from '../Campo.jsx'
import { ETIQUETAS_TIPO_LINEA } from '../../constants/cotizaciones.js'
import { importeValido } from '../../utils/importes.js'
import { pesos } from '../../utils/formato.js'

const OPCIONES_TIPO = [
  { valor: 'SERVICIO_BASICO', etiqueta: ETIQUETAS_TIPO_LINEA.SERVICIO_BASICO },
  { valor: 'SERVICIO_ESPECIALIZADO', etiqueta: ETIQUETAS_TIPO_LINEA.SERVICIO_ESPECIALIZADO },
]
const INICIAL = { servicioTipo: '', servicioDescripcion: '', servicioValor: '' }

// Agrega una línea de servicio básico o especializado: descripción y valor digitados por
// quien elabora la cotización, sin catálogo. 'onAgregar({tipo, descripcion, valor})' devuelve
// un mensaje de error, o null si se agregó. Es su propio <form>: un Enter aquí no envía la cotización.
export default function FormularioServicio({ onAgregar }) {
  const [datos, setDatos] = useState(INICIAL)
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState('')

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))
  // En el valor solo caben dígitos, coma y punto: si se escribe una letra, no aparece
  const soloImporte = (e) => {
    e.target.value = e.target.value.replace(/[^\d.,]/g, '')
    cambiar(e)
  }

  function agregar(e) {
    e.preventDefault()
    const descripcion = datos.servicioDescripcion.trim().replace(/\s+/g, ' ')
    const valor = importeValido(datos.servicioValor)

    const encontrados = {}
    if (!datos.servicioTipo) encontrados.servicioTipo = 'Este campo es obligatorio'
    if (!descripcion) encontrados.servicioDescripcion = 'Este campo es obligatorio'
    if (valor === null) {
      encontrados.servicioValor = 'Escriba un valor mayor que 0, solo números, sin puntos de miles y con hasta 2 decimales'
    }
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const error = onAgregar({ tipo: datos.servicioTipo, descripcion, valor })
    if (error) {
      setMensaje(error)
      return
    }
    setDatos(INICIAL)
    setMensaje('Servicio agregado.')
  }

  const vistaPrevia = importeValido(datos.servicioValor)

  return (
    <form noValidate onSubmit={agregar}>
      <Campo etiqueta="Tipo de servicio" nombre="servicioTipo" valor={datos.servicioTipo}
        onCambio={cambiar} opciones={OPCIONES_TIPO} error={errores.servicioTipo} />
      <Campo etiqueta="Descripción" nombre="servicioDescripcion" valor={datos.servicioDescripcion}
        onCambio={cambiar} maxLength={200} autoComplete="off" error={errores.servicioDescripcion} />
      <Campo etiqueta="Valor (en pesos)" nombre="servicioValor" valor={datos.servicioValor}
        onCambio={soloImporte} inputMode="decimal" maxLength={13} autoComplete="off"
        ayuda={vistaPrevia ? `Se agregará como ${pesos(vistaPrevia)}` : 'Solo números, sin puntos de miles. Use coma para los centavos.'}
        error={errores.servicioValor} />

      {mensaje && <p role="status">{mensaje}</p>}
      <div className="acciones">
        <button type="submit">Agregar servicio</button>
      </div>
    </form>
  )
}