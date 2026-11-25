import { useState } from 'react'
import { useNavigate } from 'react-router'
import FormularioSede from '../components/sedes/FormularioSede.jsx'
import { useSesion } from '../auth/SesionContext.jsx'

const INICIAL = { nombre: '', direccion: '', departamento: '', ciudad: '' }

// Agregar sede. Nunca nace como principal: la principal solo se cambia con «Designar como principal».
export default function SedeNueva() {
  const { llamar } = useSesion()
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erroresServidor, setErroresServidor] = useState([])

  async function crear(datos) {
    setEnviando(true) // desactiva el botón: evita crear dos sedes con un doble clic
    setErroresServidor([])
    try {
      const creada = await llamar('/api/portal/sedes', { metodo: 'POST', cuerpo: datos })
      // Vuelve al listado con un aviso de éxito
      navegar('/sedes', { state: { aviso: `La sede «${creada.nombre}» fue agregada.` } })
    } catch (error) {
      // 409: nombre repetido o límite de sedes. Lo escrito se conserva para corregirlo.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1>Agregar sede</h1>
      <FormularioSede
        inicial={INICIAL}
        textoEnviar="Agregar sede"
        enviando={enviando}
        erroresServidor={erroresServidor}
        onEnviar={crear}
        onCancelar={() => navegar('/sedes')}
      />
    </section>
  )
}