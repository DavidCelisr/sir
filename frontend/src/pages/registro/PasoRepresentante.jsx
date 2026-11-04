import Campo from '../../components/Campo.jsx'
import { TIPOS_DOCUMENTO, etiquetaNumero } from '../../constants/tiposDocumento.js'
import { HOY } from './validaciones.js'

const OPCIONES = TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))

// Persona jurídica: información del representante legal.
export default function PasoRepresentante({ datos, errores, onCambio }) {
  return (
    <section>
      <h2>Información del representante legal</h2>

      <Campo etiqueta="Nombres" nombre="nombres" valor={datos.nombres} onCambio={onCambio} error={errores.nombres} />
      <Campo etiqueta="Apellidos" nombre="apellidos" valor={datos.apellidos} onCambio={onCambio} error={errores.apellidos} />
      <Campo etiqueta="Tipo de identificación" nombre="tipoDocumento" valor={datos.tipoDocumento} onCambio={onCambio} opciones={OPCIONES} error={errores.tipoDocumento} />
      <Campo etiqueta={etiquetaNumero(datos.tipoDocumento)} nombre="numeroDocumento" valor={datos.numeroDocumento} onCambio={onCambio} error={errores.numeroDocumento} />
      <Campo etiqueta="Fecha de expedición" nombre="fechaExpedicion" tipo="date" max={HOY} valor={datos.fechaExpedicion} onCambio={onCambio} error={errores.fechaExpedicion} />
      <Campo etiqueta="Número de teléfono celular" nombre="telefono" tipo="tel" valor={datos.telefono} onCambio={onCambio} error={errores.telefono} />
      <Campo etiqueta="Correo electrónico" nombre="correo" tipo="email" valor={datos.correo} onCambio={onCambio} error={errores.correo} />
      <Campo etiqueta="Dirección de residencia" nombre="direccion" valor={datos.direccion} onCambio={onCambio} error={errores.direccion} />
    </section>
  )
}