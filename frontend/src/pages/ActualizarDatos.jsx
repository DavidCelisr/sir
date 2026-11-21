import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Campo from '../components/Campo.jsx'
import { useSesion } from '../auth/SesionContext.jsx'
import { ETIQUETAS_ROL } from '../constants/roles.js'
import { TIPOS_DOCUMENTO } from '../constants/tiposDocumento.js'

const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// Revisa el formato de lo editable. El backend siempre vuelve a validar.
function validar(d) {
  const errores = {}
  if (!d.nombres.trim()) errores.nombres = 'Este campo es obligatorio'
  if (!d.apellidos.trim()) errores.apellidos = 'Este campo es obligatorio'
  if (!d.correo.trim()) errores.correo = 'Este campo es obligatorio'
  else if (!correoValido(d.correo.trim())) errores.correo = 'El correo no tiene un formato válido'
  return errores
}

// De los datos de la cuenta que devuelve el backend, solo lo editable pasa al formulario.
const datosDe = (cuenta) => ({ nombres: cuenta.nombres, apellidos: cuenta.apellidos ?? '', correo: cuenta.correo })

// Actualizar datos, disponible para los tres roles. Arriba, la información que NO
// se puede editar; debajo, el formulario con nombres, apellidos y correo.
export default function ActualizarDatos() {
  const { llamar, empresa, refrescar } = useSesion()
  const [cuenta, setCuenta] = useState(null) // datos de la cuenta, tal como los devuelve el backend
  const [datos, setDatos] = useState({ nombres: '', apellidos: '', correo: '' })
  const [carga, setCarga] = useState('cargando') // 'cargando' | 'listo' | 'error'
  const [errores, setErrores] = useState({})
  const [erroresServidor, setErroresServidor] = useState([])
  const [exito, setExito] = useState(false)
  const [enviando, setEnviando] = useState(false)

  // Al abrir la pantalla se piden los datos al backend: así siempre están al día
  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    llamar('/api/portal/usuarios/mi-cuenta')
      .then((respuesta) => {
        if (!activo) return
        setCuenta(respuesta)
        setDatos(datosDe(respuesta))
        setCarga('listo')
      })
      .catch(() => { if (activo) setCarga('error') })
    return () => { activo = false }
  }, [llamar])

  const cambiar = (e) => setDatos((previo) => ({ ...previo, [e.target.name]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    setExito(false)
    setErroresServidor([])

    const encontrados = validar(datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true) // desactiva el botón: evita enviar dos veces con un doble clic
    try {
      // Solo viajan estos tres campos. El rol, el documento y la empresa no se pueden cambiar desde aquí.
      const actualizada = await llamar('/api/portal/usuarios/mi-cuenta', {
        metodo: 'PATCH',
        cuerpo: { nombres: datos.nombres, apellidos: datos.apellidos, correo: datos.correo },
      })
      setCuenta(actualizada)
      setDatos(datosDe(actualizada))
      await refrescar() // el círculo y la bienvenida muestran el nombre de la sesión
      setExito(true)
    } catch (error) {
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  if (carga === 'cargando') return <section><p>Cargando datos…</p></section>
  if (carga === 'error') {
    return <section><p role="alert">No se pudieron cargar sus datos. Intente de nuevo más tarde.</p></section>
  }

  // Los usuarios anteriores a D-24 no tienen documento registrado
  const tipoDocumento = TIPOS_DOCUMENTO.find((t) => t.valor === cuenta.tipoDocumento)?.etiqueta ?? 'No registrado'

  return (
    <section>
      <h1>Actualizar datos de usuario</h1>

      <h2>Datos del usuario</h2>
      <dl className="info-cuenta">
        <dt>Nombre de la empresa</dt>
        <dd>{empresa.nombre}</dd>
        <dt>Rol</dt>
        <dd>{ETIQUETAS_ROL[cuenta.rol] ?? cuenta.rol}</dd>
        <dt>Tipo de documento</dt>
        <dd>{tipoDocumento}</dd>
        <dt>Número de documento</dt>
        <dd>{cuenta.numeroDocumento ?? 'No registrado'}</dd>
      </dl>

      <h2>Actualice sus datos</h2>
      <form noValidate onSubmit={enviar}>
        <Campo etiqueta="Nombres" nombre="nombres" valor={datos.nombres} onCambio={cambiar}
          autoComplete="given-name" error={errores.nombres} />
        <Campo etiqueta="Apellidos" nombre="apellidos" valor={datos.apellidos} onCambio={cambiar}
          autoComplete="family-name" error={errores.apellidos}
          ayuda={!cuenta.apellidos
            ? 'Su registro es anterior a esta pantalla: si Nombres contiene su nombre completo, deje solo sus nombres y escriba sus apellidos aquí.'
            : undefined} />
        <Campo etiqueta="Correo electrónico" nombre="correo" tipo="email" valor={datos.correo}
          onCambio={cambiar} autoComplete="email" error={errores.correo}
          ayuda="A este correo llegan los códigos de recuperación de contraseña." />

        {erroresServidor.length > 0 && (
          <div className="alerta" role="alert">
            <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
        {exito && <div className="exito" role="status">Datos actualizados.</div>}

        <div className="acciones">
          <Link to="/inicio">Volver al inicio</Link>
          <button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </form>
    </section>
  )
}