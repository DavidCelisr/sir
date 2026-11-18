
/*
 * Cliente HTTP único del frontend.
 * Todas las pantallas se comunican con el backend por aquí.
 */

// Función que se ejecuta cuando expira o falla una sesión autenticada.
let alExpirar = null

export const alExpirarSesion = (funcion) => {
  alExpirar = funcion
}

// Error personalizado para las respuestas fallidas del backend.
export class ErrorApi extends Error {
  constructor(estado, mensaje, errores = []) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.errores = errores
  }
}

// Realizar peticiones HTTP al backend.
export async function llamarApi(
  ruta,
  { metodo = 'GET', cuerpo, token } = {}
) {
  let respuesta

  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor')
  }

  // Intentar interpretar la respuesta como JSON.
  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const porDefecto = respuesta.status >= 500
      ? 'El servidor no está disponible. Intente más tarde.'
      : 'Ocurrió un error inesperado'

    // Si una petición autenticada devuelve 401, notificar
    // al módulo de sesión para cerrar la sesión.
    if (token && respuesta.status === 401 && alExpirar) {
      try {
        alExpirar()
      } catch {
        // No ocultar el error HTTP original.
      }
    }

    throw new ErrorApi(
      respuesta.status,
      datos?.error ?? porDefecto,
      datos?.errores ?? [],
    )
  }

  return datos
}
