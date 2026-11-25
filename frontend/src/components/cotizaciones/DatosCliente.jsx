import Campo from '../Campo.jsx'
import { TIPOS_DOCUMENTO, etiquetaNumero } from '../../constants/tiposDocumento.js'
import CamposUbicacion from '../CamposUbicacion.jsx'

const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))
const etiquetaTipo = (valor) => TIPOS_DOCUMENTO.find((t) => t.valor === valor)?.etiqueta ?? valor

// Sección "Cliente" de la cotización. Se escribe el documento y se busca al cliente:
//  - estado 'existente': sus datos se muestran SIN edición
//  - estado 'nuevo': se muestra el formulario para registrarlo.
export default function DatosCliente({
  documento, nuevo, estado, existente, errores, errorBusqueda,
  onCambioDocumento, onCambioNuevo, onBuscar,
}) {
  // Enter en el número de documento busca al cliente. No debe hacer nada más.
  const alPulsarTecla = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onBuscar()
    }
  }

  return (
    <section className="bloque" aria-labelledby="titulo-cliente">
      <h2 id="titulo-cliente">Cliente</h2>

      <Campo etiqueta="Tipo de documento" nombre="tipoDocumento" valor={documento.tipoDocumento}
        onCambio={onCambioDocumento} opciones={OPCIONES_DOCUMENTO} error={errores.tipoDocumento} />
      <Campo etiqueta={etiquetaNumero(documento.tipoDocumento)} nombre="numeroDocumento"
        valor={documento.numeroDocumento} onCambio={onCambioDocumento} onKeyDown={alPulsarTecla}
        maxLength={30} autoComplete="off" error={errores.numeroDocumento} />

      <div className="acciones">
        <button type="button" onClick={onBuscar} disabled={estado === 'buscando'}>
          {estado === 'buscando' ? 'Buscando…' : 'Buscar cliente'}
        </button>
      </div>

      {errores.cliente && <small className="error" role="alert">{errores.cliente}</small>}
      {errorBusqueda && <div className="alerta" role="alert">{errorBusqueda}</div>}

      {estado === 'existente' && existente && (
        <>
          <div className="info" role="status">
            Cliente registrado. Sus datos se muestran sin edición: se corrigen desde el detalle de un caso.
          </div>
          <dl className="info-cuenta">
            <dt>Documento</dt>
            <dd>{etiquetaTipo(existente.tipoDocumento)} {existente.numeroDocumento}</dd>
            <dt>Nombre</dt>
            <dd>{existente.nombre}</dd>
            <dt>Correo</dt>
            <dd>{existente.correo ?? 'No registrado'}</dd>
            <dt>Teléfono</dt>
            <dd>{existente.telefono ?? 'No registrado'}</dd>
            <dt>Ciudad de residencia</dt>
            <dd>{existente.ciudad ?? 'No registrada'}</dd>
            <dt>Dirección</dt>
            <dd>{existente.direccion ?? 'No registrada'}</dd>
          </dl>
        </>
      )}

      {estado === 'nuevo' && (
        <>
          <div className="info" role="status">
            No hay un cliente con ese documento: se registrará como cliente nuevo.
          </div>
          <Campo etiqueta="Nombre completo o razón social" nombre="nombre" valor={nuevo.nombre}
            onCambio={onCambioNuevo} maxLength={150} autoComplete="off" error={errores.nombre} />
          <Campo etiqueta="Correo electrónico" nombre="correo" tipo="email" valor={nuevo.correo}
            onCambio={onCambioNuevo} requerido={false} maxLength={120} autoComplete="off"
            ayuda="Sin correo, la cotización se entrega impresa o como PDF."
            error={errores.correo} />
          <Campo etiqueta="Teléfono o celular" nombre="telefono" tipo="tel" valor={nuevo.telefono}
            onCambio={onCambioNuevo} requerido={false} maxLength={20} autoComplete="off" error={errores.telefono} />
          {/* Opcional. El departamento solo ayuda a elegir la ciudad: solo se guarda la ciudad */}
          <CamposUbicacion
            datos={nuevo} errores={errores} onCambio={onCambioNuevo} requerido={false}
            nombreDepartamento="departamentoResidencia" nombreCiudad="ciudad"
            etiquetaDepartamento="Departamento de residencia" etiquetaCiudad="Ciudad de residencia"
          />
          <Campo etiqueta="Dirección" nombre="direccion" valor={nuevo.direccion}
            onCambio={onCambioNuevo} requerido={false} maxLength={200} autoComplete="off" error={errores.direccion} />
        </>
      )}
    </section>
  )
}