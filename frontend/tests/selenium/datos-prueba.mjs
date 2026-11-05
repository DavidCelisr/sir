import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Lee las credenciales del superadministrador desde backend/.env.
// parseEnv solo lee el archivo y devuelve un objeto: sin modifica las variables
// del sistema. La ruta es relativa a ESTE archivo (frontend/tests/selenium/).
const env = parseEnv(readFileSync(new URL('../../../backend/.env', import.meta.url), 'utf8'))

// Dirección del backend. Se llama directo (sin el proxy de Vite) para que la
// preparación de datos no dependa del frontend.
const API_URL = process.env.API_URL ?? `http://127.0.0.1:${env.PORT ?? 3000}`

// Envia una petición JSON al backend. Si responde con error, lanza una excepcion
// con el mensaje del backend para que el motivo se vea en el reporte de la prueba.
async function llamarApi(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch (error) {
    // 'fetch failed' no dice nada útil; la causa real está en error.cause (ej. ECONNREFUSED)
    const causa = error.cause?.code ?? error.cause?.message ?? error.message
    throw new Error(`No se pudo conectar con el backend en ${API_URL} (${causa}). ¿Está encendido?`)
  }
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error(`${metodo} ${ruta} respondió ${respuesta.status}: ${datos?.error ?? 'sin detalle'}`)
  }
  return datos
}

// Genera una invitación nueva (como el superadministrador) y devuelve su token.
// Cada llamada crea una invitación distinta, por eso las pruebas no se estorban.
export async function crearInvitacion() {
  if (!env.SUPERADMIN_USUARIO || !env.SUPERADMIN_PASSWORD) {
    throw new Error('Faltan SUPERADMIN_USUARIO o SUPERADMIN_PASSWORD en backend/.env')
  }

  // 1. Login del superadministrador (no se imprime ni se guarda la contraseña)
  const { token } = await llamarApi('/api/superadmin/login', {
    metodo: 'POST',
    cuerpo: { nombreUsuario: env.SUPERADMIN_USUARIO, password: env.SUPERADMIN_PASSWORD },
  })

  // 2. Generar la invitación (UC-04). Solo se usa el token: el enlace completo
  //    lo arma la prueba con BASE_URL, para poder cambiar el puerto del frontend.
  const invitacion = await llamarApi('/api/superadmin/invitaciones', { metodo: 'POST', token })
  return invitacion.token
}
// NIT de 9 dígitos al azar: cada ejecución registra una empresa distinta,
// y el NIT debe ser único en la base de datos.
export function nitAleatorio() {
  return String(Math.floor(100000000 + Math.random() * 900000000))
}