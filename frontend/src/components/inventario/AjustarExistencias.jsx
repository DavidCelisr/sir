import { useState } from 'react'
import Campo from '../Campo.jsx'
import { numero } from '../../utils/formato.js'

const OPCIONES = [
  { valor: 'AUMENTAR', etiqueta: 'Aumentar existencias (entrada)' },
  { valor: 'DISMINUIR', etiqueta: 'Disminuir existencias (salida)' },
]
const MAXIMO = 1_000_000 // mismo tope por ajuste que el backend

// Ajuste de existencias: nunca se escribe el total, solo se suma o se resta.
// El usuario elige el sentido y escribe una cantidad positiva; aquí se arma el signo
// que espera el backend (positivo suma, negativo resta).
export default function AjustarExistencias({ unidadesActuales, enviando, erroresServidor, onEnviar, onCancelar }) {
  const [datos, setDatos] = useState({ tipo: '', cantidad: '' })
  const [errores, setErrores] = useState({})

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))
  // Solo dígitos: si se escribe una letra, no aparece
  const soloDigitos = (e) => {
    e.target.value = e.target.value.replace(/\D/g, '')
    cambiar(e)
  }

  function enviar(e) {
    e.preventDefault()
    const encontrados = {}
    const cantidad = Number(datos.cantidad)

    if (!datos.tipo) encontrados.tipo = 'Este campo es obligatorio'
    if (datos.cantidad === '') encontrados.cantidad = 'Este campo es obligatorio'
    else if (cantidad < 1 || cantidad > MAXIMO) encontrados.cantidad = `Debe estar entre 1 y ${numero(MAXIMO)}`

    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return
    onEnviar(datos.tipo === 'AUMENTAR' ? cantidad : -cantidad)
  }

  return (
    <form noValidate onSubmit={enviar}>
      <p>Unidades actuales: <strong>{numero(unidadesActuales)}</strong></p>

      <Campo etiqueta="Tipo de ajuste" nombre="tipo" valor={datos.tipo} onCambio={cambiar}
        opciones={OPCIONES} error={errores.tipo} />
      <Campo etiqueta="Cantidad" nombre="cantidad" valor={datos.cantidad} onCambio={soloDigitos}
        inputMode="numeric" maxLength={7} autoComplete="off" error={errores.cantidad} />

      {erroresServidor.length > 0 && (
        <div className="alerta" role="alert">
          <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <div className="acciones">
        <button type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Aplicar ajuste'}</button>
      </div>
    </form>
  )
}