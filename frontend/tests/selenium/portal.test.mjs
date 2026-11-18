import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { By } from 'selenium-webdriver'
import {
  BASE_URL, crearDriver, esperar, clic, porTexto, escribir, elegir,
  esperarServidores, leerToken, rutaActual,
} from './helpers.mjs'
import { registrarEmpresa, registrarEmpresaConAdministrador } from './datos-prueba.mjs'

let driver

// Antes de abrir el navegador se comprueba que los servidores respondan...
before(async () => {
  await esperarServidores()
  driver = await crearDriver()
})

// ...y al terminar se cierra, aunque alguna prueba falle.
after(async () => {
  await driver?.quit()
})

// PRUEBA 1: credenciales incorrectas no inician sesión ni guardan el token
test('Login con credenciales incorrectas muestra el error, no inicia sesión y no guarda el token', async () => {
  // 1. Abrir el portal. Sin token guardado, la pantalla muestra el formulario de ingreso.
  await driver.get(`${BASE_URL}/portal`)
  await esperar(driver, porTexto('h1', 'Portal SIR'))

  // 2. Escribir un usuario que no existe y una clave cualquiera, y pulsar Ingresar.
  //    Los campos se identifican por su id: "campo-" + el nombre del campo.
  await escribir(driver, 'nombreUsuario', 'usuario.inexistente')
  await escribir(driver, 'password', 'ClaveEquivocada123')
  await clic(driver, porTexto('button', 'Ingresar'))

  // 3. Esperar el mensaje de error del backend. Es IMPORTANTE esperarlo antes de revisar
  //    lo demás: mientras la petición no termine, "no hay token" sería cierto por
  //    casualidad, y la prueba aprobaría sin haber comprobado nada.
  await esperar(driver, porTexto('div', 'Credenciales incorrectas'))

  // 4. Sigue en el portal: no pasó a /inicio
  assert.equal(await rutaActual(driver), '/portal', 'Debe seguir en /portal')

  // 5. No se guardó ninguna sesión en el navegador
  assert.equal(await leerToken(driver), null, 'No debe guardarse ningún token')
})

// Llena y envía el formulario "Crear usuario" del portal. La lista de tipo de
// documento se elige por su texto visible y los campos por su id ("campo-" + nombre).
async function crearUsuarioDesdePortal(nit, nombreUsuario, clave) {
  await elegir(driver, 'tipoDocumento', 'NIT')
  await escribir(driver, 'numeroDocumento', nit)
  await escribir(driver, 'nombreUsuario', nombreUsuario)
  await escribir(driver, 'password', clave)
  await escribir(driver, 'confirmacionPassword', clave)
  await clic(driver, porTexto('button', 'Crear cuenta'))
}

// PRUEBA 2: el portal crea el administrador de una empresa y rechaza un segundo
test('Crear usuario: crea el administrador de una empresa y rechaza un segundo intento', async () => {
  // Preparación (no es parte de la interfaz): una empresa registrada y sin administrador
  const { nit } = await registrarEmpresa()
  const primerUsuario = `admin.${nit}`
  const segundoUsuario = `admin2.${nit}`
  const CLAVE = 'ClaveSelenium123'

  // 1. Abrir el portal e ir a la pestaña "Crear usuario"
  await driver.get(`${BASE_URL}/portal`)
  await esperar(driver, porTexto('h1', 'Portal SIR'))
  await clic(driver, porTexto('button', 'Crear usuario'))
  await esperar(driver, porTexto('button', 'Crear cuenta'))

  // 2. Crear el administrador
  await crearUsuarioDesdePortal(nit, primerUsuario, CLAVE)

  // 3. Esperar el mensaje de éxito. Se compara que CONTENGA el nombre de usuario
  //    para no depender de la redacción exacta del resto del mensaje.
  const exito = await esperar(driver, By.css('div.exito'))
  const textoExito = await exito.getText()
  assert.ok(
    textoExito.includes(`El usuario ${primerUsuario} fue creado`),
    `El mensaje de éxito no es el esperado: ${textoExito}`,
  )

  // 4. La pantalla pasó a la pestaña de ingreso, pero NO inició sesión:
  //    crear la cuenta y entrar son pasos distintos
  await esperar(driver, porTexto('button', 'Ingresar'))
  assert.equal(await rutaActual(driver), '/portal', 'Debe seguir en /portal')
  assert.equal(await leerToken(driver), null, 'Crear el usuario no debe iniciar sesión')

  // 5. Segundo intento sobre la MISMA empresa, con otro nombre de usuario:
  //    así el rechazo solo puede deberse a que ya existe un administrador
  await clic(driver, porTexto('button', 'Crear usuario'))
  await esperar(driver, porTexto('button', 'Crear cuenta'))
  await crearUsuarioDesdePortal(nit, segundoUsuario, CLAVE)

  // 6. Debe aparecer el mensaje definido. El error del servidor se muestra como un elemento de lista dentro de la alerta.
  await esperar(driver, porTexto('li', 'La empresa ya tiene un usuario principal/administrador asignado'))

  // 7. No hubo éxito ni sesión
  const exitos = await driver.findElements(By.css('div.exito'))
  assert.equal(exitos.length, 0, 'El segundo intento no debe mostrar el mensaje de éxito')
  assert.equal(await leerToken(driver), null, 'Tampoco debe guardarse ningún token')
})

// PRUEBA 3: sesión completa: ingreso, recarga y cierre de sesión
test('Login correcto: entra a /inicio, la sesión sobrevive a F5 y al cerrar sesión se descarta', async () => {
  // Preparación (no es parte de la interfaz): empresa con su administrador ya creado
  const { nit, nombreUsuario, clave, nombre, razonSocial } = await registrarEmpresaConAdministrador()

  // 1. Usuario REAL con clave equivocada: mismo mensaje que si no existiera y sin sesión
  await driver.get(`${BASE_URL}/portal`)
  await esperar(driver, porTexto('h1', 'Portal SIR'))
  await escribir(driver, 'nombreUsuario', nombreUsuario)
  await escribir(driver, 'password', 'ClaveEquivocada123')
  await clic(driver, porTexto('button', 'Ingresar'))
  await esperar(driver, porTexto('div', 'Credenciales incorrectas'))
  assert.equal(await rutaActual(driver), '/portal', 'Con clave equivocada debe seguir en /portal')
  assert.equal(await leerToken(driver), null, 'Con clave equivocada no debe guardarse ningún token')

  // 2. Se recarga el portal para dejar el formulario limpio, y se ingresa con la clave correcta
  await driver.get(`${BASE_URL}/portal`)
  await esperar(driver, porTexto('h1', 'Portal SIR'))
  await escribir(driver, 'nombreUsuario', nombreUsuario)
  await escribir(driver, 'password', clave)
  await clic(driver, porTexto('button', 'Ingresar'))

  // 3. Llega a /inicio y muestra los datos del usuario y de la empresa
  await esperar(driver, porTexto('h1', `Bienvenido, ${nombre}`))
  await esperar(driver, porTexto('p', `Empresa: ${razonSocial}`))
  await esperar(driver, porTexto('p', 'Rol: Administrador de empresa'))
  assert.equal(await rutaActual(driver), '/inicio', 'Debe estar en /inicio')

  // 4. El token quedó guardado y tiene forma de JWT (tres partes separadas por puntos)
  const token = await leerToken(driver)
  assert.match(token ?? '', /^[\w-]+\.[\w-]+\.[\w-]+$/, 'Debe guardarse un token con forma de JWT')

  // 5. Recargar con F5: el frontend vuelve a validar el token con el backend y la sesión sigue activa, con el mismo token
  await driver.navigate().refresh()
  await esperar(driver, porTexto('h1', `Bienvenido, ${nombre}`))
  assert.equal(await rutaActual(driver), '/inicio', 'Tras recargar debe seguir en /inicio')
  assert.equal(await leerToken(driver), token, 'Tras recargar debe conservarse el mismo token')

  // 6. Cerrar sesión: vuelve al portal, descarta el token y NO muestra avisos de error
  //    (cerrar sesión por voluntad propia no es una sesión vencida)
  await clic(driver, porTexto('button', 'Cerrar sesión'))
  await esperar(driver, porTexto('h1', 'Portal SIR'))
  assert.equal(await rutaActual(driver), '/portal', 'Al cerrar sesión debe volver a /portal')
  assert.equal(await leerToken(driver), null, 'Al cerrar sesión debe descartarse el token')
  const avisos = await driver.findElements(By.css('div.alerta'))
  assert.equal(avisos.length, 0, 'Cerrar sesión por voluntad propia no debe mostrar avisos')

  // 7. Sin sesión, abrir /inicio directamente redirige al portal
  await driver.get(`${BASE_URL}/inicio`)
  await esperar(driver, porTexto('h1', 'Portal SIR'))
  assert.equal(await rutaActual(driver), '/portal', 'Sin sesión, /inicio debe redirigir a /portal')
})