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
  // Un 500 el servidor (o el proxy) no está disponible
  const porDefecto = respuesta.status >= 500 && !datos
    ? 'El servidor no está disponible. Intente más tarde.'
    : 'Ocurrió un error inesperado'

  throw new ErrorApi(
    respuesta.status,
    datos?.error ?? porDefecto,
    datos?.errores ?? [],
    )
  }
  return datos
}