import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import FormularioSede from '../components/sedes/FormularioSede.jsx'
import { useSesion } from '../auth/SesionContext.jsx'
import { ubicacionValida } from '../utils/ubicacion.js'

// Editar sede: nombre, dirección, departamento y ciudad. No cambia cuál es la principal
// (para eso está «Designar como principal»). El backend no tiene "GET /sedes/:id": la lista es corta,
// así que se pide completa y se busca ahí la sede.
export default function SedeEditar() {
  const { id } = useParams()
  const { llamar } = useSesion()
  const navegar = useNavigate()

  const [sede, setSede] = useState(null)
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'no-existe' | 'error'
  const [version, setVersion] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [erroresServidor, setErroresServidor] = useState([])

  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    setCarga('cargando')
    llamar('/api/portal/sedes')
      .then((respuesta) => {
        if (!activo) return
        const encontrada = respuesta.sedes.find((s) => String(s.id) === id)
        setSede(encontrada ?? null)
        setCarga(encontrada ? 'listo' : 'no-existe')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar, id, version])

  async function guardar(datos) {
    setEnviando(true) // desactiva el botón: evita guardar dos veces con un doble clic
    setErroresServidor([])
    try {
      const actualizada = await llamar(`/api/portal/sedes/${sede.id}`, { metodo: 'PATCH', cuerpo: datos })
      navegar('/sedes', { state: { aviso: `La sede «${actualizada.nombre}» fue actualizada.` } })
    } catch (error) {
      // 409 (nombre repetido) o 404 (la eliminaron mientras se editaba). Lo escrito se conserva.
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  if (carga === 'cargando') return <section><p>Cargando sede…</p></section>

  if (carga === 'no-existe') {
    return (
      <section>
        <h1>Sede no encontrada</h1>
        <p>La sede no existe, fue eliminada o no pertenece a su empresa.</p>
        <Link to="/sedes">Volver al listado</Link>
      </section>
    )
  }

  if (carga === 'error') {
    return (
      <section>
        <div className="alerta" role="alert">
          No se pudo cargar la sede. <button type="button" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
        <Link to="/sedes">Volver al listado</Link>
      </section>
    )
  }

  // Las sedes creadas por la migración (empresas registradas antes de las listas) pueden tener un
  // departamento o una ciudad que no coincide con las listas: se avisa y se piden de nuevo.
  const ubicacionOk = ubicacionValida(sede.departamento, sede.ciudad)

  return (
    <section>
      <h1>Editar sede</h1>

      {sede.esPrincipal && (
        <p>
          Esta es la sede principal. Puede cambiar su nombre y sus datos; para cambiar cuál es la principal,
          use «Designar como principal» en otra sede.
        </p>
      )}

      {!ubicacionOk && (
        <div className="info" role="status">
          La ubicación registrada ({sede.departamento}, {sede.ciudad}) no coincide con las listas de departamentos
          y ciudades. Elíjala de nuevo para poder guardar.
        </div>
      )}

      <FormularioSede
        inicial={{
          nombre: sede.nombre,
          direccion: sede.direccion ?? '',
          departamento: ubicacionOk ? sede.departamento : '',
          ciudad: ubicacionOk ? sede.ciudad : '',
        }}
        textoEnviar="Guardar cambios"
        enviando={enviando}
        erroresServidor={erroresServidor}
        onEnviar={guardar}
        onCancelar={() => navegar('/sedes')}
      />
    </section>
  )
}