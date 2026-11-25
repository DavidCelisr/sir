import { useState } from 'react'
import Campo from '../Campo.jsx'
import CamposUbicacion from '../CamposUbicacion.jsx'

const OBLIGATORIO = 'Este campo es obligatorio'

// Valida el formato; el backend también verifica que la ciudad pertenezca al departamento.
function validar(d) {
  const errores = {}
  if (!d.nombre.trim()) errores.nombre = OBLIGATORIO
  if (!d.departamento) errores.departamento = OBLIGATORIO
  if (!d.ciudad) errores.ciudad = OBLIGATORIO
  return errores
}

// Campos de una sede: nombre o código, dirección (opcional), departamento y ciudad. Nada más.
// Sirve para agregar y para editar. 'onEnviar' recibe los datos ya listos.
export default function FormularioSede({ inicial, textoEnviar, enviando, erroresServidor, onEnviar, onCancelar }) {
  const [datos, setDatos] = useState(inicial)
  const [errores, setErrores] = useState({})

  const cambiar = (e) => {
    const { name, value } = e.target
    setDatos((previo) => ({
      ...previo,
      [name]: value,
      // Al cambiar el departamento, la ciudad elegida ya no corresponde
      ...(name === 'departamento' ? { ciudad: '' } : {}),
    }))
  }

  function enviar(e) {
    e.preventDefault()
    const encontrados = validar(datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    onEnviar({
      nombre: datos.nombre.trim(),
      direccion: datos.direccion.trim(), // vacío = sin dirección (el backend la guarda como nula)
      departamento: datos.departamento,
      ciudad: datos.ciudad,
    })
  }

  return (
    <form noValidate onSubmit={enviar}>
      <Campo etiqueta="Nombre o código de la sede" nombre="nombre" valor={datos.nombre} onCambio={cambiar}
        maxLength={80} autoComplete="off"
        ayuda="Lo define la empresa. Por ejemplo: «Sede 01 - Ibagué» o «Sede Bogotá»."
        error={errores.nombre} />
      <Campo etiqueta="Dirección" nombre="direccion" valor={datos.direccion} onCambio={cambiar}
        requerido={false} maxLength={200} autoComplete="off" error={errores.direccion} />
      <CamposUbicacion datos={datos} errores={errores} onCambio={cambiar} />

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