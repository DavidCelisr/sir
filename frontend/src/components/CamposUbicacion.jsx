import Campo from './Campo.jsx'
import colombia from '../data/colombia.json'

// Opciones de departamento: se calculan una sola vez
const DEPARTAMENTOS = colombia.map((d) => ({ valor: d.departamento, etiqueta: d.departamento }))

// Dos listas dependientes: el municipio depende del departamento elegido.
// Por defecto los campos se llaman "departamento" y "ciudad" (como en el registro de la empresa).
// Si en la misma pantalla hay otro par de campos, se pasan otros nombres:
//   nombreDepartamento / nombreCiudad  -> claves en el objeto 'datos' (y ids "campo-" + nombre)
// 'requerido' indica si los campos son obligatorios (por defecto sí; si no, dicen "(opcional)").
// El departamento SOLO ayuda a elegir la ciudad: quien usa este componente decide qué guarda.
export default function CamposUbicacion({
  datos, errores, onCambio,
  nombreDepartamento = 'departamento', nombreCiudad = 'ciudad',
  etiquetaDepartamento = 'Departamento', etiquetaCiudad = 'Ciudad o municipio',
  ayudaCiudad, requerido = true,
}) {
  const departamento = datos[nombreDepartamento]
  const seleccionado = colombia.find((d) => d.departamento === departamento)
  const municipios = (seleccionado?.municipios ?? []).map((m) => ({ valor: m, etiqueta: m }))

  return (
    <>
      <Campo etiqueta={etiquetaDepartamento} nombre={nombreDepartamento} valor={departamento}
        onCambio={onCambio} opciones={DEPARTAMENTOS} requerido={requerido} error={errores[nombreDepartamento]} />
      {/* Desactivada hasta elegir departamento: sin él no hay municipios que mostrar */}
      <Campo etiqueta={etiquetaCiudad} nombre={nombreCiudad} valor={datos[nombreCiudad]}
        onCambio={onCambio} opciones={municipios} disabled={!seleccionado} requerido={requerido}
        ayuda={ayudaCiudad} error={errores[nombreCiudad]} />
    </>
  )
}