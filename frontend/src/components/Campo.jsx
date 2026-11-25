// Campo de formulario reutilizable: etiqueta + control + ayuda + error.
// Si recibe 'opciones' dibuja una lista desplegable; si recibe 'multilinea', un cuadro de texto
// de varias líneas; si no, un input. El atributo 'nombre' debe coincidir con la clave en el
// objeto de datos, y el id del control es "campo-" + nombre.
export default function Campo({
  etiqueta, nombre, valor, onCambio, tipo = 'text',
  opciones, multilinea = false, ayuda, error, requerido = true, ...resto
}) {
  const id = `campo-${nombre}`
  return (
    <div className="campo">
      <label htmlFor={id}>
        {etiqueta}{requerido ? ' *' : ' (opcional)'}
      </label>

      {opciones ? (
        <select id={id} name={nombre} value={valor} onChange={onCambio} {...resto}>
          <option value="">Seleccione…</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
          ))}
        </select>
      ) : multilinea ? (
        <textarea id={id} name={nombre} value={valor} onChange={onCambio} rows={5} {...resto} />
      ) : (
        <input id={id} name={nombre} type={tipo} value={valor} onChange={onCambio} {...resto} />
      )}

      {ayuda && <small className="ayuda">{ayuda}</small>}
      {error && <small className="error" role="alert">{error}</small>}
    </div>
  )
}