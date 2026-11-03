// Cliente HTTP único del frontend. Todas las pantallas hablan con el backend
// por aquí, de modo que los encabezados y el manejo de errores viven en un solo lugar.

// Error que lanza el cliente cuando el backend responde con un fallo.
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = []) {
    super(mensaje)
    this.estado = estado // código HTTP (0 si ni siquiera hubo respuesta)
    this.errores = errores // lista de errores de validación, si el backend la envía
  }
}

// ruta: '/api/...'  |  token: JWT, solo en rutas protegidas
export async function llamarApi(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  let respuesta
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    // fetch solo falla así cuando no hay conexión con el servidor
    throw new ErrorApi(0, 'No se pudo conectar con el servidor')
  }

  // Si la respuesta no trae JSON, se tolera
  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    // El backend responde { error } (un texto) o { errores } (una lista)
    throw new ErrorApi(
      respuesta.status,
      datos?.error ?? 'Ocurrió un error inesperado',
      datos?.errores ?? [],
    )
  }
  return datos
}