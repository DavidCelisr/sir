import Campo from '../../components/Campo.jsx'

// Persona jurídica: datos de la empresa.
export default function PasoEmpresa({ datos, errores, onCambio }) {
  return (
    <section>
      <h2>Datos de la empresa</h2>
      <p>Tipo de identificación: Número de identificación tributaria (NIT)</p>

      <Campo etiqueta="Número de NIT" nombre="numeroIdentificacion" valor={datos.numeroIdentificacion} onCambio={onCambio} error={errores.numeroIdentificacion} />
      <Campo etiqueta="Dígito de verificación" nombre="digitoVerificacion" valor={datos.digitoVerificacion} onCambio={onCambio} error={errores.digitoVerificacion} />
      <Campo etiqueta="Consecutivo" nombre="consecutivo" valor={datos.consecutivo} onCambio={onCambio} requerido={false} />
      <Campo
        etiqueta="Razón social" nombre="razonSocial" valor={datos.razonSocial} onCambio={onCambio}
        ayuda="Debe coincidir exactamente con el RUT, sin omisiones ni abreviaturas."
        error={errores.razonSocial}
      />
      <Campo etiqueta="Departamento" nombre="departamento" valor={datos.departamento} onCambio={onCambio} error={errores.departamento} />
      <Campo etiqueta="Ciudad o municipio" nombre="ciudad" valor={datos.ciudad} onCambio={onCambio} error={errores.ciudad} />
    </section>
  )
}