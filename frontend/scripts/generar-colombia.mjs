// Esto genera src/data/colombia.json a partir de la DIVIPOLA (DANE), publicada en datos.gov.co.
// Se ejecuta UNA vez a mano:  node scripts/generar-colombia.mjs
// El resultado se guarda en el proyecto para que el formulario no dependa de un portal externo.
import { writeFile, mkdir } from 'node:fs/promises'

const URL_DIVIPOLA = 'https://www.datos.gov.co/resource/gdxc-w37w.json?$limit=2000'

const respuesta = await fetch(URL_DIVIPOLA)
if (!respuesta.ok) throw new Error(`datos.gov.co respondió ${respuesta.status}`)
const todas = await respuesta.json()

// Si las columnas no son las esperadas, se muestra la primera fila para poder ajustarlas
if (!todas[0]?.dpto || !todas[0]?.nom_mpio) {
  console.error('Columnas inesperadas. Primera fila:', todas[0])
  process.exit(1)
}
const filas = todas.filter((f) => f.dpto && f.nom_mpio)

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'])

// Si el nombre viene TODO EN MAYÚSCULAS lo pasa a formato título;
// si ya viene bien escrito, lo deja igual.
function titulo(nombre) {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  if (limpio !== limpio.toUpperCase()) return limpio
  return limpio
    .toLowerCase()
    .split(' ')
    .map((palabra, i) => {
      if (/^[a-z]\.[a-z]\.?,?$/.test(palabra)) return palabra.toUpperCase() // d.c. -> D.C.
      if (i > 0 && MINUSCULAS.has(palabra)) return palabra
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join(' ')
}

// Agrupa los municipios por departamento (el Set elimina repetidos)
const porDepartamento = new Map()
for (const fila of filas) {
  const departamento = titulo(fila.dpto)
  if (!porDepartamento.has(departamento)) porDepartamento.set(departamento, new Set())
  porDepartamento.get(departamento).add(titulo(fila.nom_mpio))
}

// Orden alfabético en español (respeta tildes y la ñ)
const ordenar = (a, b) => a.localeCompare(b, 'es')
const resultado = [...porDepartamento]
  .sort(([a], [b]) => ordenar(a, b))
  .map(([departamento, municipios]) => ({ departamento, municipios: [...municipios].sort(ordenar) }))

await mkdir('src/data', { recursive: true })
await writeFile('src/data/colombia.json', JSON.stringify(resultado, null, 2))

const total = resultado.reduce((suma, d) => suma + d.municipios.length, 0)
console.log(`${resultado.length} departamentos y ${total} municipios guardados en src/data/colombia.json`)
console.log('Ejemplo:', resultado[0].departamento, '→', resultado[0].municipios.slice(0, 3).join(', '))