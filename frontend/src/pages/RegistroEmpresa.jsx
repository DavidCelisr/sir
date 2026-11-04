import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { llamarApi, ErrorApi } from '../api/cliente.js'
import { validar } from './registro/validaciones.js'
import { armarSolicitud } from './registro/solicitud.js'
import PasoAfiliacion from './registro/PasoAfiliacion.jsx'
import PasoEmpresa from './registro/PasoEmpresa.jsx'
import PasoPersonaNatural from './registro/PasoPersonaNatural.jsx'
import PasoTerminos from './registro/PasoTerminos.jsx'
import PasoRepresentante from './registro/PasoRepresentante.jsx'
import Exito from './registro/Exito.jsx'

// Pasos de cada tipo de afiliación, después de elegirla
// No hay paso de OTP: el último paso envía el registro.
const PASOS = {
  PERSONA_JURIDICA: ['empresa', 'terminos', 'representante'],
  PERSONA_NATURAL: ['datos', 'terminos'],
}

// Todos los campos del formulario, en un solo objeto plano
const DATOS_INICIALES = {
  numeroIdentificacion: '', digitoVerificacion: '', consecutivo: '', razonSocial: '',
  departamento: '', ciudad: '',
  nombres: '', apellidos: '', tipoDocumento: '', numeroDocumento: '', fechaExpedicion: '',
  telefono: '', correo: '', direccion: '',
  nacionalidad1: '', nacionalidad2: '', paisNacimiento: '', ciudadNacimiento: '', profesionOcupacion: '',
}

// Pantalla 1: registro de empresa
export default function RegistroEmpresa() {
  const { token } = useParams() // el :token de la URL /invitacion/:token

  // 'cargando' | 'valida' | 'invalida' | 'error'
  const [estadoToken, setEstadoToken] = useState('cargando')
  const [afiliacion, setAfiliacion] = useState(null)
  const [paso, setPaso] = useState('afiliacion')
  const [datos, setDatos] = useState(DATOS_INICIALES)
  const [errores, setErrores] = useState({}) // errores por campo, del frontend
  const [erroresServidor, setErroresServidor] = useState([]) // errores que devuelve el backend
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null) // { numeroContrato } al terminar

  // Al abrir el enlace, se consulta si la invitación sigue vigente
  useEffect(() => {
    let activo = true // evita actualizar el estado si la pantalla ya se cerró
    async function verificar() {
      try {
        await llamarApi(`/api/registro/invitaciones/${encodeURIComponent(token)}`)
        if (activo) setEstadoToken('valida')
      } catch (error) {
        // 404 = inexistente, vencida o ya usada; otro fallo = problema de conexión
        if (activo) setEstadoToken(error.estado === 404 ? 'invalida' : 'error')
      }
    }
    verificar()
    return () => { activo = false }
  }, [token])

  // Pasos del tipo elegido y posición actual
  const pasos = afiliacion ? PASOS[afiliacion] : []
  const indice = pasos.indexOf(paso)
  const esUltimo = indice === pasos.length - 1

  // Cada input actualiza su clave en 'datos' usando su atributo name
  const cambiar = (e) => {
  const { name, value } = e.target
  setDatos((previo) => ({
    ...previo,
    [name]: value,
    // Al cambiar el departamento, el municipio anterior ya no corresponde
    ...(name === 'departamento' ? { ciudad: '' } : {}),
  }))
}

  function elegirAfiliacion(tipo) {
    setAfiliacion(tipo)
    setPaso(PASOS[tipo][0])
    setErrores({})
  }

  function atras() {
    setErrores({})
    setErroresServidor([])
    setPaso(indice === 0 ? 'afiliacion' : pasos[indice - 1])
  }

  // Valida el paso actual: avanza, o envía si es el último
  function continuar() {
    const encontrados = validar(paso, datos)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) return

    if (esUltimo) enviar()
    else setPaso(pasos[indice + 1])
  }

  // POST /api/registro/empresas
  async function enviar() {
    setEnviando(true)
    setErroresServidor([])
    try {
      const respuesta = await llamarApi('/api/registro/empresas', {
        metodo: 'POST',
        cuerpo: armarSolicitud(token, afiliacion, datos),
      })
      setResultado(respuesta)
    } catch (error) {
      // 404: la invitación venció o se usó mientras se llenaba el formulario
      if (error.estado === 404) return setEstadoToken('invalida')
      setErroresServidor(error.errores?.length > 0 ? error.errores : [error.message])
    } finally {
      setEnviando(false)
    }
  }

  // --- Qué se muestra según el estado ---
  if (estadoToken === 'cargando') return <main><p>Verificando invitación…</p></main>

  if (estadoToken === 'invalida') {
    // Mensaje provisional
    return (
      <main>
        <h1>Invitación no válida</h1>
        <p>La invitación no es válida o ya no está vigente. Solicite una nueva.</p>
      </main>
    )
  }

  if (estadoToken === 'error') {
    return <main><p>No se pudo verificar la invitación. Intente de nuevo más tarde.</p></main>
  }

  if (resultado) {
    return <main><Exito numeroContrato={resultado.numeroContrato} correo={datos.correo} /></main>
  }

  return (
    <main>
      <h1>Registro de empresa</h1>

      {paso === 'afiliacion' ? (
        <PasoAfiliacion onElegir={elegirAfiliacion} />
      ) : (
        // noValidate: la validación la hacemos nosotros, con nuestros mensajes.
        // El envío del formulario (Enter o botón) siempre pasa por continuar().
        <form noValidate onSubmit={(e) => { e.preventDefault(); continuar() }}>
          <p>Paso {indice + 2} de {pasos.length + 1}</p>

          {paso === 'empresa' && <PasoEmpresa datos={datos} errores={errores} onCambio={cambiar} />}
          {paso === 'datos' && <PasoPersonaNatural datos={datos} errores={errores} onCambio={cambiar} />}
          {paso === 'terminos' && <PasoTerminos afiliacion={afiliacion} />}
          {paso === 'representante' && <PasoRepresentante datos={datos} errores={errores} onCambio={cambiar} />}

          {erroresServidor.length > 0 && (
            <div className="alerta" role="alert">
              <ul>{erroresServidor.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}

          <div className="acciones">
            <button type="button" onClick={atras} disabled={enviando}>Atrás</button>
            {/* Desactivado mientras envía: evita registrar dos veces con un doble clic */}
            <button type="submit" disabled={enviando}>
              {enviando
                ? 'Registrando…'
                : paso === 'terminos'
                  ? (esUltimo ? 'Aceptar y registrar empresa' : 'Aceptar y continuar')
                  : (esUltimo ? 'Registrar empresa' : 'Continuar')}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}