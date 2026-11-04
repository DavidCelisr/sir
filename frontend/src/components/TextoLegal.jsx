// Convierte el texto legal en elementos HTML:
//   "# "  -> título del documento      "## " -> subtítulo
//   "1. " -> ítem de lista numerada    otra línea -> párrafo
export default function TextoLegal({ texto }) {
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean)

  // Se agrupan las líneas en bloques; los ítems seguidos forman una sola lista
  const bloques = []
  for (const linea of lineas) {
    if (linea.startsWith('## ')) {
      bloques.push({ tipo: 'h3', contenido: linea.slice(3) })
    } else if (linea.startsWith('# ')) {
      bloques.push({ tipo: 'h2', contenido: linea.slice(2) })
    } else if (/^\d+\.\s+/.test(linea)) {
      const item = linea.replace(/^\d+\.\s+/, '')
      const ultimo = bloques[bloques.length - 1]
      if (ultimo?.tipo === 'ol') ultimo.contenido.push(item)
      else bloques.push({ tipo: 'ol', contenido: [item] })
    } else {
      bloques.push({ tipo: 'p', contenido: linea })
    }
  }

  return bloques.map((b, i) => {
    if (b.tipo === 'h2') return <h2 key={i}>{b.contenido}</h2>
    if (b.tipo === 'h3') return <h3 key={i}>{b.contenido}</h3>
    if (b.tipo === 'ol') return <ol key={i}>{b.contenido.map((it, j) => <li key={j}>{it}</li>)}</ol>
    return <p key={i}>{b.contenido}</p>
  })
}