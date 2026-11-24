import { useState } from 'react'
import { useNavigate } from 'react-router'
import FormularioPieza from '../components/inventario/FormularioPieza.jsx'
import { useSesion } from '../auth/SesionContext.jsx'

// Agregar pieza: las unidades iniciales se fijan aquí; después solo cambian con un ajuste.
export default function PiezaNueva() {
  const { llamar } = useSesion()
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [erroresServidor, setErroresServidor] = useState([])

  async function crear(datos) {
    setEnviando(true) // desactiva el botón: evita crear dos piezas con un doble clic
    setErroresServidor([])
    try {
      const creada = await llamar('/api/portal/inventario', { metodo: 'POST', cuerpo: datos })
      // Vuelve al listado con un aviso de éxito
      navegar('/inventario', { state: { aviso: `La pieza ${creada.nombre} fue agregada.` } })
    } catch (error) {
      // 409: ya hay una pieza activa con ese código. Lo escrito se conserva para corregirlo.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section>
      <h1>Agregar pieza</h1>
      <FormularioPieza
        inicial={{ codigo: '', nombre: '', precioUnitario: '', unidades: '0', stockMinimo: '0' }}
        conUnidades
        textoEnviar="Agregar pieza"
        enviando={enviando}
        erroresServidor={erroresServidor}
        onEnviar={crear}
        onCancelar={() => navegar('/inventario')}
      />
    </section>
  )
}