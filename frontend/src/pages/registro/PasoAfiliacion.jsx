// Primer paso: elegir el tipo de afiliación.
export default function PasoAfiliacion({ onElegir }) {
  return (
    <section>
      <h2>Tipo de afiliación</h2>
      <p>Seleccione el tipo de afiliación de la empresa.</p>
      <div className="opciones">
        <button type="button" onClick={() => onElegir('PERSONA_NATURAL')}>Persona natural</button>
        <button type="button" onClick={() => onElegir('PERSONA_JURIDICA')}>Persona jurídica</button>
      </div>
    </section>
  )
}