import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { By } from 'selenium-webdriver'
import {
  BASE_URL, crearDriver, esperar, clic, porTexto, erroresDelCampo,
  escribir, elegir, elegirPrimera, escribirFecha,
} from './helpers.mjs'
import { crearInvitacion, nitAleatorio } from './datos-prueba.mjs'

// Token con formato UUID que nunca se genera: la prueba no depende
// del estado de mi base de datos ni de enlaces que ya se ha usado.
const TOKEN_INEXISTENTE = '00000000-0000-4000-8000-000000000000'

let driver

// Se abre UN navegador antes de las pruebas de este archivo...
before(async () => {
  driver = await crearDriver()
})

// ...y se cierra al final, incluso si alguna prueba falla.
after(async () => {
  await driver?.quit()
})

// PRUEBA 1: un enlace con un token que no existe no debe mostrar el formulario
test('Un enlace de invitación inventado muestra "Invitación no válida"', async () => {
  // 1. Abrir el enlace: base + ruta de la Pantalla 1 + token
  await driver.get(`${BASE_URL}/invitacion/${TOKEN_INEXISTENTE}`)

  // 2. Esperar el título. La pantalla primero dice "Verificando invitación…" y
  //    luego cambia. Si el título no aparece en 10 s (por ejemplo, con el backend
  //    apagado), esta línea lanza un error y la prueba falla.
  await esperar(driver, porTexto('h1', 'Invitación no válida'))

  // 3. Comprobar que NO se muestra el formulario: el botón de afiliación no debe existir.
  //    findElements devuelve una lista; si está vacía, el elemento no está en la página.
  const botones = await driver.findElements(porTexto('button', 'Persona jurídica'))
  assert.equal(botones.length, 0, 'No debe mostrarse el formulario de registro')
})

// PRUEBA 2: el primer paso de persona jurídica exige los campos obligatorios
test('Persona jurídica: Continuar con el formulario vacío muestra los 5 errores y no avanza', async () => {
  // Preparación: una invitación válida, creada por el backend (no es parte de la interfaz)
  const token = await crearInvitacion()

  // 1. Abrir la pantalla con esa invitación. Esperar el título que indica que el
  //    backend la reconoció como vigente (si no lo hace, el formulario no aparece).
  await driver.get(`${BASE_URL}/invitacion/${token}`)
  await esperar(driver, porTexto('h2', 'Tipo de afiliación'))

  // 2. Elegir persona jurídica y comprobar que llegó al paso 2 de 4
  await clic(driver, porTexto('button', 'Persona jurídica'))
  await esperar(driver, porTexto('h2', 'Datos de la empresa'))
  await esperar(driver, porTexto('p', 'Paso 2 de 4'))

  // 3. Pulsar Continuar SIN escribir nada
  await clic(driver, porTexto('button', 'Continuar'))

  // 4. Esperar a que aparezcan los errores (la validación es inmediata, pero React
  //    necesita un instante para dibujarlos). Si no aparecen, la prueba falla.
  await driver.wait(
    async () => (await driver.findElements(By.css('small.error'))).length >= 5,
    10000,
    'No aparecieron los errores de validación',
  )

  // 5. Deben ser exactamente 5, todos con el mismo mensaje
  const errores = await driver.findElements(By.css('small.error'))
  assert.equal(errores.length, 5, 'Deben mostrarse exactamente 5 errores')
  for (const error of errores) {
    assert.equal(await error.getText(), 'Este campo es obligatorio')
  }

  // 6. Cada uno de los 5 campos obligatorios tiene su error...
  for (const campo of ['numeroIdentificacion', 'digitoVerificacion', 'razonSocial', 'departamento', 'ciudad']) {
    const delCampo = await erroresDelCampo(driver, campo)
    assert.equal(delCampo.length, 1, `El campo ${campo} debe mostrar un error`)
  }

  // 7. ...y el Consecutivo, que es opcional, no tiene ninguno
  const delConsecutivo = await erroresDelCampo(driver, 'consecutivo')
  assert.equal(delConsecutivo.length, 0, 'El Consecutivo es opcional y no debe marcar error')

  // 8. No avanzó: sigue en "Datos de la empresa" y no apareció el paso de términos
  const titulosTerminos = await driver.findElements(porTexto('h2', 'Términos, condiciones y autorizaciones'))
  assert.equal(titulosTerminos.length, 0, 'No debe avanzar al paso de términos')
})

// PRUEBA 3: registro completo de una persona jurídica, de punta a punta
test('Persona jurídica: el registro completo termina en "Registro completado" y consume la invitación', async () => {
  const CORREO = 'prueba.selenium@example.com'
  const token = await crearInvitacion() // preparación, no es parte de la interfaz
  const enlace = `${BASE_URL}/invitacion/${token}`
  const nit = nitAleatorio()

  // --- Tipo de afiliación ---
  await driver.get(enlace)
  await esperar(driver, porTexto('h2', 'Tipo de afiliación'))
  await clic(driver, porTexto('button', 'Persona jurídica'))

  // --- Paso 2: datos de la empresa ---
  await esperar(driver, porTexto('h2', 'Datos de la empresa'))
  await escribir(driver, 'numeroIdentificacion', nit)
  await escribir(driver, 'digitoVerificacion', '3')
  await escribir(driver, 'razonSocial', `Empresa Selenium ${nit}`) // el NIT permite ubicarla al limpiar

  // La ciudad depende del departamento: esta desactivada hasta elegir uno
  let ciudad = await esperar(driver, By.id('campo-ciudad'))
  assert.equal(await ciudad.isEnabled(), false, 'La ciudad debe estar desactivada sin departamento')
  await elegir(driver, 'departamento', 'Antioquia')
  await elegirPrimera(driver, 'ciudad')
  ciudad = await driver.findElement(By.id('campo-ciudad'))
  assert.equal(await ciudad.isEnabled(), true, 'La ciudad debe activarse al elegir departamento')

  await clic(driver, porTexto('button', 'Continuar'))

  // --- Paso 3: términos (sin casilla, D-15) ---
  await esperar(driver, porTexto('h2', 'Términos, condiciones y autorizaciones'))
  await esperar(driver, porTexto('p', 'Paso 3 de 4'))

  const casillas = await driver.findElements(By.css('input[type="checkbox"]'))
  assert.equal(casillas.length, 0, 'Ya no debe haber casilla de aceptación')

  // El aviso debe ser el de persona jurídica
  const aviso = await driver.findElement(By.css('p.aviso-legal')).getText()
  assert.ok(
    aviso.startsWith('Al continuar, acepto los Términos y Condiciones de Uso de SIR y confirmo'),
    `El aviso no es el esperado: ${aviso}`,
  )
  assert.ok(!aviso.includes('Persona Natural'), 'Para persona jurídica no debe mostrarse el aviso de persona natural')

  await clic(driver, porTexto('button', 'Aceptar y continuar'))

  // --- Paso 4: representante legal ---
  await esperar(driver, porTexto('h2', 'Información del representante legal'))
  await escribir(driver, 'nombres', 'Marta')
  await escribir(driver, 'apellidos', 'Rojas Díaz')
  await elegir(driver, 'tipoDocumento', 'Cédula de ciudadanía')
  await escribir(driver, 'numeroDocumento', '52123456')
  await escribirFecha(driver, 'fechaExpedicion', '2012-05-10')
  await escribir(driver, 'telefono', '3001112233')
  await escribir(driver, 'correo', CORREO)
  await escribir(driver, 'direccion', 'Carrera 7 # 12-30')
  await clic(driver, porTexto('button', 'Registrar empresa'))

  // --- Resultado ---
  await esperar(driver, porTexto('h1', 'Registro completado'))

  // El contrato lo asigna el backend (5 dígitos, RT-03): se valida el formato, no el valor
  const contrato = await driver.findElement(By.css('main strong')).getText()
  assert.match(contrato, /^\d{5}$/, `El número de contrato debe tener 5 dígitos, llegó: ${contrato}`)

  // El mensaje menciona el correo del representante
  const pantalla = await driver.findElement(By.css('main')).getText()
  assert.ok(pantalla.includes(CORREO), 'El mensaje final debe mencionar el correo del representante')

  // --- La invitación quedó consumida (RN-30): el mismo enlace ya no sirve ---
  await driver.get(enlace)
  await esperar(driver, porTexto('h1', 'Invitación no válida'))
})