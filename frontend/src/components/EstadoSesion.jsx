// Lo que se muestra mientras la sesión no está resuelta: 'verificando' o 'sin-conexion'.
export default function EstadoSesion({ estado, reintentar }) {
  if (estado === 'verificando') return <main><p>Verificando sesión…</p></main>
  return (
    <main>
      <h1>Sin conexión</h1>
      <p role="alert">No se pudo verificar su sesión. Revise su conexión e intente de nuevo.</p>
      <button type="button" onClick={reintentar}>Reintentar</button>
    </main>
  )
}