import Campo from '../../components/Campo.jsx'
import CamposUbicacion from '../../components/CamposUbicacion.jsx'

// Deja pasar solo dígitos: si se escribe una letra, no aparece en el campo
const soloDigitos = (alCambiar) => (e) => {
  e.target.value = e.target.value.replace(/\D/g, '')
  alCambiar(e)
}

// Persona jurídica: datos de la empresa.
export default function PasoEmpresa({ datos, errores, onCambio }) {
  return (
    <section>
      <h2>Datos de la empresa</h2>
      <p>Tipo de identificación: Número de identificación tributaria (NIT)</p>

      <Campo etiqueta="Número de NIT" nombre="numeroIdentificacion" valor={datos.numeroIdentificacion}
        onCambio={soloDigitos(onCambio)} inputMode="numeric" maxLength={9}
        ayuda="Solo números, 9 dígitos, sin el dígito de verificación." error={errores.numeroIdentificacion} />
      <Campo etiqueta="Dígito de verificación" nombre="digitoVerificacion" valor={datos.digitoVerificacion}
        onCambio={soloDigitos(onCambio)} inputMode="numeric" maxLength={1} error={errores.digitoVerificacion} />
      <Campo etiqueta="Consecutivo" nombre="consecutivo" valor={datos.consecutivo} onCambio={onCambio} requerido={false} />
      <Campo etiqueta="Razón social" nombre="razonSocial" valor={datos.razonSocial} onCambio={onCambio}
        ayuda="Debe coincidir exactamente con el RUT, sin omisiones ni abreviaturas." error={errores.razonSocial} />
      <CamposUbicacion datos={datos} errores={errores} onCambio={onCambio} />
    </section>
  )
}