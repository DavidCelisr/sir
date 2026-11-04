import TextoLegal from '../../components/TextoLegal.jsx'
import { LEGAL } from '../../constants/textosLegales.js'

// Términos, tratamiento de datos y declaraciones. Sin casilla:
// el botón "Aceptar y continuar" equivale a la aceptación del aviso.
export default function PasoTerminos({ afiliacion }) {
  const legal = LEGAL[afiliacion] // el texto cambia según jurídica o natural
  return (
    <section>
      <h2>Términos, condiciones y autorizaciones</h2>
      <p>Lea los siguientes documentos antes de continuar.</p>
      <div className="caja-texto">
        <TextoLegal texto={legal.documentos} />
      </div>
      <p className="aviso-legal">{legal.aviso}</p>
    </section>
  )
}