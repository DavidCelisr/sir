import { Builder, Browser, By, until } from 'selenium-webdriver'

// Dirección base del frontend (sin ninguna ruta). Cada prueba le agrega la suya.
// Si el frontend corre en otro puerto, se puede cambiar sin tocar el código:
//   $env:BASE_URL='http://localhost:5174'; node --test ...
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

// Tiempo máximo (en milisegundos) que se espera a que algo aparezca en pantalla
const ESPERA_MS = 10000

// Abre Microsoft Edge.
export async function crearDriver() {
  const driver = await new Builder().forBrowser(Browser.EDGE).build()
  await driver.manage().window().maximize()
  return driver
}

// Atajo para buscar un elemento por su texto exacto.
// Ejemplo: porTexto('h1', 'Registro completado')
export const porTexto = (etiqueta, texto) =>
  By.xpath(`//${etiqueta}[normalize-space()="${texto}"]`)

// Espera a que el elemento exista y sea visible. Si no aparece a tiempo,
// lanza un error y la prueba FALLA. Es mejor que una pausa fija: espera lo
// justo, sin importar si la página tarda 100 ms o 3 segundos.
export async function esperar(driver, localizador, ms = ESPERA_MS) {
  try {
    const elemento = await driver.wait(until.elementLocated(localizador), ms)
    await driver.wait(until.elementIsVisible(elemento), ms)
    return elemento
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error
    const url = await driver.getCurrentUrl()
    const texto = await driver.findElement(By.css('body')).getText().catch(() => '(sin texto)')
    throw new Error(`${error.message}\n  URL: ${url}\n  Pantalla: ${texto.replace(/\s+/g, ' ').slice(0, 300)}`)
  }
}
// Espera a que el elemento aparezca y le hace clic
export async function clic(driver, localizador) {
  const elemento = await esperar(driver, localizador)
  await elemento.click()
}

// Devuelve la lista de mensajes de error que muestra un campo del formulario.
// Cada campo está en un <div class="campo"> y su error en un <small class="error">.
// El id del campo es "campo-" + su nombre. Ejemplo: erroresDelCampo(driver, 'razonSocial')
export const erroresDelCampo = (driver, nombre) =>
  driver.findElements(
    By.xpath(`//div[@class="campo"][.//*[@id="campo-${nombre}"]]//small[@class="error"]`),
  )
// Escribe en un campo de texto. El id del campo es "campo-" + su nombre.
export async function escribir(driver, nombre, texto) {
  const campo = await esperar(driver, By.id(`campo-${nombre}`))
  await campo.sendKeys(texto)
}

// Elige una opción de una lista desplegable por su texto visible.
// Ejemplo: elegir(driver, 'departamento', 'Antioquia')
export async function elegir(driver, nombre, texto) {
  const opcion = await esperar(
    driver,
    By.xpath(`//select[@id="campo-${nombre}"]/option[normalize-space()="${texto}"]`),
  )
  await opcion.click()
}

// Elige la primera opción real de una lista (la posición 1 es "Seleccione…").
// Devuelve el texto elegido por si se quiere mostrar. Espera a que la lista se llene.
export async function elegirPrimera(driver, nombre) {
  const opcion = await esperar(driver, By.xpath(`//select[@id="campo-${nombre}"]/option[2]`))
  const texto = await opcion.getText()
  await opcion.click()
  return texto
}

// Asigna una fecha (formato AAAA-MM-DD) a un campo de tipo fecha.
// No se teclea porque el orden día/mes/año depende del idioma del sistema.
// React solo reconoce el cambio si se usa el asignador nativo del navegador
// y se dispara un evento 'input'; asignar .value a secas no le avisa.
export async function escribirFecha(driver, nombre, fecha) {
  const campo = await esperar(driver, By.id(`campo-${nombre}`))
  await driver.executeScript(
    `const asignar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
     asignar.call(arguments[0], arguments[1])
     arguments[0].dispatchEvent(new Event('input', { bubbles: true }))`,
    campo,
    fecha,
  )
}

// Comprueba que frontend y backend estén listos ANTES de abrir el navegador.
// Llama a /api/health por la dirección del frontend: el proxy de Vite la reenvía
// al backend, así que una sola llamada verifica los dos servidores.
// Reintenta hasta 30 s: tolera un reinicio breve del backend (node --watch).
export async function esperarServidores(maxMs = 30000) {
  const limite = Date.now() + maxMs
  let motivo = 'sin respuesta'
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`${BASE_URL}/api/health`)
      if (respuesta.ok) return
      motivo = `respondió ${respuesta.status}` // 500 = el proxy no alcanza al backend
    } catch (error) {
      motivo = error.cause?.code ?? error.message // ECONNREFUSED = el frontend está apagado
    }
    await new Promise((resolver) => setTimeout(resolver, 1000)) // reintenta cada segundo
  }
  throw new Error(`Los servidores no están listos en ${BASE_URL} (${motivo}). ¿Están encendidos el backend y el frontend?`)
}

// Clave donde el frontend guarda el token (src/auth/almacen.js).
// Si allí cambia, hay que cambiarla también aquí.
export const CLAVE_TOKEN = 'sir.token'

// Lee el token guardado en el sessionStorage del navegador. Devuelve null si no hay.
// Selenium no puede ver el almacenamiento directamente: se le pide al navegador
// que ejecute un pequeño script y devuelva el resultado.
export const leerToken = (driver) =>
  driver.executeScript('return window.sessionStorage.getItem(arguments[0])', CLAVE_TOKEN)

// Devuelve la ruta actual (por ejemplo '/portal'), sin la dirección base ni parámetros.
export async function rutaActual(driver) {
  return new URL(await driver.getCurrentUrl()).pathname
}