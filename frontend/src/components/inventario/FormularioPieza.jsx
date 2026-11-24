import { useState } from 'react'
import Campo from '../Campo.jsx'
import { ETIQUETA_PRECIO } from '../../constants/inventario.js'
import { pesos } from '../../utils/formato.js'

const LIMITE = 1_000_000_000 // mismo tope que el backend para unidades y mínimo

// Deja pasar solo los caracteres que cumplen el patrón: si se escribe una letra, no aparece
const filtrar = (patron, alCambiar) => (e) => {
  e.target.value = e.target.value.replace(patron, '')
  alCambiar(e)
}

// Valida el precio ingresado, admite coma o punto decimal y rechaza formatos inválidos o valores menores o iguales a cero.
function importeValido(texto) {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(limpio)) return null
  return Number(limpio) > 0 ? limpio : null
}

// Revisa el formato; el backend siempre vuelve a validar
function validar(d, conUnidades) {
  const errores = {}
  const nombre = d.nombre.trim()

  if (!nombre) errores.nombre = 'Este campo es obligatorio'
  else if (nombre.length > 120) errores.nombre = 'No puede pasar de 120 caracteres'
  if (d.codigo.trim().length > 40) errores.codigo = 'No puede pasar de 40 caracteres'

  if (importeValido(d.precioUnitario) === null) {
    errores.precioUnitario = 'Escriba un valor mayor que 0, solo números, sin puntos de miles y con hasta 2 decimales'
  }
  if (d.stockMinimo === '') errores.stockMinimo = 'Este campo es obligatorio'
  else if (Number(d.stockMinimo) > LIMITE) errores.stockMinimo = 'El valor es demasiado grande'
  if (conUnidades) {
    if (d.unidades === '') errores.unidades = 'Este campo es obligatorio'
    else if (Number(d.unidades) > LIMITE) errores.unidades = 'El valor es demasiado grande'
  }
  return errores
}

// Campos de una pieza: sirve para agregar (con las unidades iniciales) y para editar (sin ellas:
// las existencias solo cambian con un ajuste). 'onEnviar' recibe los datos ya listos.
export default function FormularioPieza({
  inicial, conUnidades = false, textoEnviar, enviando, erroresServidor, onEnviar, onCancelar,
}) {
  const [datos, setDatos] = useState(inicial)
  const [errores, setErrores] = useState({})

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))
  const soloDigitos = (alCambiar) => filtrar(/\D/g, alCambiar)
  const soloImporte = (alCambiar) => filtrar(/[^\d.,]/g, alCambiar)

  function enviar(e) {
    e.preventDefault()
    const encontrados = validar(datos, conUnidades)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    onEnviar({
      codigo: datos.codigo.trim(), // vacío = sin código (el backend lo guarda como nulo)
      nombre: datos.nombre.trim(),
      precioUnitario: importeValido(datos.precioUnitario), // texto con punto decimal
      stockMinimo: Number(datos.stockMinimo),
      ...(conUnidades ? { unidades: Number(datos.unidades) } : {}),
    })
  }

  // Vista previa del precio: ayuda a detectar un error de tipeo antes de guardar
  const importe = importeValido(datos.precioUnitario)

  return (
    <form noValidate onSubmit={enviar}>
      <Campo etiqueta="Código" nombre="codigo" valor={datos.codigo} onCambio={cambiar}
        requerido={false} maxLength={40} autoComplete="off" error={errores.codigo} />
      <Campo etiqueta="Nombre" nombre="nombre" valor={datos.nombre} onCambio={cambiar}
        maxLength={120} autoComplete="off" error={errores.nombre} />
      <Campo etiqueta={`${ETIQUETA_PRECIO} (en pesos)`} nombre="precioUnitario" valor={datos.precioUnitario}
        onCambio={soloImporte(cambiar)} inputMode="decimal" maxLength={13} autoComplete="off"
        ayuda={importe ? `Se guardará como ${pesos(importe)}` : 'Solo números, sin puntos de miles. Use coma para los centavos.'}
        error={errores.precioUnitario} />
      {conUnidades && (
        <Campo etiqueta="Unidades disponibles" nombre="unidades" valor={datos.unidades}
          onCambio={soloDigitos(cambiar)} inputMode="numeric" maxLength={10} autoComplete="off"
          ayuda="Después solo se cambian con un ajuste de existencias." error={errores.unidades} />
      )}
      <Campo etiqueta="Mínimo en stock" nombre="stockMinimo" valor={datos.stockMinimo}
        onCambio={soloDigitos(cambiar)} inputMode="numeric" maxLength={10} autoComplete="off"
        ayuda="Cuando las unidades llegan a este valor, la pieza se marca como “Bajo el mínimo”."
        error={errores.stockMinimo} />

      {erroresServidor.length > 0 && (
        <div className="alerta" role="alert">
          <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <div className="acciones">
        <button type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        {/* Desactivado mientras envía: evita guardar dos veces con un doble clic */}
        <button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : textoEnviar}</button>
      </div>
    </form>
  )
}