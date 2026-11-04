// Campo de formulario reutilizable: etiqueta + control + ayuda + error.
// Si recibe 'opciones' dibuja una lista desplegable; si no, un input.
// El atributo 'nombre' debe coincidir con la clave en el objeto de datos.
export default function Campo({
  etiqueta, nombre, valor, onCambio, tipo = 'text',
  opciones, ayuda, error, requerido = true, ...resto
}) {
  const id = `campo-${nombre}`
  return (
    <div className="campo">
      <label htmlFor={id}>
        {etiqueta}{requerido ? ' *' : ' (opcional)'}
      </label>

      {opciones ? (
        <select id={id} name={nombre} value={valor} onChange={onCambio}>
          <option value="">Seleccione…</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
      ) : (
        <input id={id} name={nombre} type={tipo} value={valor} onChange={onCambio} {...resto} />
      )}

      {ayuda && <small className="ayuda">{ayuda}</small>}
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  )
}