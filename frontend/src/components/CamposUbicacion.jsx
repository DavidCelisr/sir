import Campo from './Campo.jsx'
import colombia from '../data/colombia.json'

// Opciones de departamento: se calculan una sola vez
const DEPARTAMENTOS = colombia.map((d) => ({ valor: d.departamento, etiqueta: d.departamento }))

// Dos listas dependientes: el municipio depende del departamento elegido.
// Los nombres de los campos (departamento, ciudad) coinciden con el objeto 'datos'.
export default function CamposUbicacion({ datos, errores, onCambio }) {
  const seleccionado = colombia.find((d) => d.departamento === datos.departamento)
  const municipios = (seleccionado?.municipios ?? []).map((m) => ({ valor: m, etiqueta: m }))

  return (
    <>
      <Campo etiqueta="Departamento" nombre="departamento" valor={datos.departamento}
        onCambio={onCambio} opciones={DEPARTAMENTOS} error={errores.departamento} />
      {/* Desactivada hasta elegir departamento: sin él no hay municipios que mostrar */}
      <Campo etiqueta="Ciudad o municipio" nombre="ciudad" valor={datos.ciudad}
        onCambio={onCambio} opciones={municipios} disabled={!seleccionado} error={errores.ciudad} />
    </>
  )
}