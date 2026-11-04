import { TEXTO_TRATAMIENTO_DATOS } from '../../constants/textosLegales.js'

// Tratamiento de datos, términos y condiciones: texto + casilla obligatoria.
// La aceptación NO se envía al backend ni se guarda. (condicionalmente se podría guardar en la base de datos, pero no es necesario).
export default function PasoTerminos({ acepta, onCambio, error }) {
  return (
    <section>
      <h2>Tratamiento de datos y términos y condiciones</h2>
      <div className="caja-texto">{TEXTO_TRATAMIENTO_DATOS}</div>

      <label>
        <input type="checkbox" checked={acepta} onChange={(e) => onCambio(e.target.checked)} />
        {' '}He leído y acepto el tratamiento de datos y los términos y condiciones
      </label>
      {error && <small className="error" role="alert"> {error}</small>}
    </section>
  )
}