import Campo from '../../components/Campo.jsx'
import { TIPOS_DOCUMENTO, etiquetaNumero } from '../../constants/tiposDocumento.js'
import { HOY } from './validaciones.js'

const OPCIONES = TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))

// Persona natural: todos sus datos en un solo paso, en el orden de la definición.
export default function PasoPersonaNatural({ datos, errores, onCambio }) {
  return (
    <section>
      <h2>Datos de la persona</h2>

      <Campo etiqueta="Tipo de identificación" nombre="tipoDocumento" valor={datos.tipoDocumento} onCambio={onCambio} opciones={OPCIONES} error={errores.tipoDocumento} />
      {/* El nombre de este campo cambia según el tipo de documento elegido */}
      <Campo etiqueta={etiquetaNumero(datos.tipoDocumento)} nombre="numeroDocumento" valor={datos.numeroDocumento} onCambio={onCambio} error={errores.numeroDocumento} />
      <Campo etiqueta="Fecha de expedición" nombre="fechaExpedicion" tipo="date" max={HOY} valor={datos.fechaExpedicion} onCambio={onCambio} error={errores.fechaExpedicion} />
      <Campo etiqueta="Nombres" nombre="nombres" valor={datos.nombres} onCambio={onCambio} error={errores.nombres} />
      <Campo etiqueta="Apellidos" nombre="apellidos" valor={datos.apellidos} onCambio={onCambio} error={errores.apellidos} />
      <Campo etiqueta="Nacionalidad 1" nombre="nacionalidad1" valor={datos.nacionalidad1} onCambio={onCambio} error={errores.nacionalidad1} />
      <Campo etiqueta="Nacionalidad 2" nombre="nacionalidad2" valor={datos.nacionalidad2} onCambio={onCambio} requerido={false} />
      <Campo etiqueta="País de nacimiento" nombre="paisNacimiento" valor={datos.paisNacimiento} onCambio={onCambio} error={errores.paisNacimiento} />
      <Campo etiqueta="Ciudad de nacimiento" nombre="ciudadNacimiento" valor={datos.ciudadNacimiento} onCambio={onCambio} error={errores.ciudadNacimiento} />
      <Campo etiqueta="Dirección de residencia" nombre="direccion" valor={datos.direccion} onCambio={onCambio} error={errores.direccion} />
      <Campo etiqueta="Número de teléfono" nombre="telefono" tipo="tel" valor={datos.telefono} onCambio={onCambio} error={errores.telefono} />
      <Campo etiqueta="Correo electrónico" nombre="correo" tipo="email" valor={datos.correo} onCambio={onCambio} error={errores.correo} />
      <Campo etiqueta="Profesión, ocupación u oficio" nombre="profesionOcupacion" valor={datos.profesionOcupacion} onCambio={onCambio} error={errores.profesionOcupacion} />
      <Campo etiqueta="Departamento" nombre="departamento" valor={datos.departamento} onCambio={onCambio} error={errores.departamento} />
      <Campo etiqueta="Ciudad o municipio" nombre="ciudad" valor={datos.ciudad} onCambio={onCambio} error={errores.ciudad} />
    </section>
  )
}