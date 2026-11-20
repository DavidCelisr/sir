import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { llamarApi, ErrorApi, alExpirarSesion } from '../api/cliente.js'
import { borrarToken, expiracionToken, guardarToken, leerToken } from './almacen.js'

const SesionContext = createContext(null)
export const useSesion = () => useContext(SesionContext)

const AVISO_VENCIDA = 'Su sesión expiró. Inicie sesión de nuevo.'
const AVISO_INVALIDA = 'Su sesión ya no es válida. Inicie sesión de nuevo.'

// Estados de la sesión:
//  'verificando'   -> se está comprobando el token (al abrir o recargar la página)
//  'autenticado'   -> sesión válida; hay usuario y empresa
//  'anonimo'       -> no hay sesión
//  'sin-conexion'  -> hay token, pero el backend no respondió: no se cierra la sesión
export function SesionProvider({ children }) {
  const [estado, setEstado] = useState('verificando')
  const [token, setToken] = useState(null)
  const [datos, setDatos] = useState(null) // { usuario, empresa }
  const [aviso, setAviso] = useState('')

  // Descarta el token y deja la sesión vacía. 'motivo' es el aviso que verá el usuario.
  // cerrarSesion NO invalida el token en el backend; solo lo quita del navegador.
  const cerrarSesion = useCallback((motivo = '') => {
    borrarToken()
    setToken(null)
    setDatos(null)
    setAviso(motivo)
    setEstado('anonimo')
  }, [])

  // el backend valida el token y devuelve usuario y empresa
  const validar = useCallback(async (tokenGuardado) => {
    try {
      const respuesta = await llamarApi('/api/portal/sesion', { token: tokenGuardado })
      setToken(tokenGuardado)
      setDatos(respuesta)
      setAviso('')
      setEstado('autenticado')
    } catch (error) {
      // 401 ya lo atiende el manejador global (alExpirarSesion)
      if (error instanceof ErrorApi && error.estado === 403) cerrarSesion(AVISO_INVALIDA)
      else if (!(error instanceof ErrorApi) || error.estado !== 401) setEstado('sin-conexion')
    }
  }, [cerrarSesion])

  // Cualquier llamada protegida que reciba 401 cierra la sesión
  useEffect(() => {
    alExpirarSesion(() => cerrarSesion(AVISO_VENCIDA))
    return () => alExpirarSesion(null)
  }, [cerrarSesion])

  // Al iniciar la aplicación o recargar la página UX
  useEffect(() => {
    const guardado = leerToken()
    if (!guardado) {
      setEstado('anonimo')
      return
    }
    const exp = expiracionToken(guardado)
    if (exp && exp <= Date.now()) {
      cerrarSesion(AVISO_VENCIDA) // ya venció: ni siquiera se consulta al backend
      return
    }
    validar(guardado)
  }, [validar, cerrarSesion])

  // Cierra la sesión a la hora exacta en que vence el token
  useEffect(() => {
    if (!token) return
    const exp = expiracionToken(token)
    if (!exp) return
    const temporizador = setTimeout(() => cerrarSesion(AVISO_VENCIDA), Math.max(exp - Date.now(), 0))
    return () => clearTimeout(temporizador)
  }, [token, cerrarSesion])

  // Después de un login correcto: se guarda el token y se piden usuario y empresa
  const iniciarSesion = useCallback(async (nuevoToken) => {
    guardarToken(nuevoToken)
    await validar(nuevoToken)
  }, [validar])

  const reintentar = useCallback(() => {
    const guardado = leerToken()

    if (!guardado) return cerrarSesion()

    setEstado('verificando')
    validar(guardado)
  }, [validar, cerrarSesion])

  // Llama al backend usando automáticamente el token de la sesión.
  const llamar = useCallback(
    (ruta, opciones = {}) => llamarApi(ruta, { ...opciones, token }),
    [token],
  )

  // Actualiza los datos del usuario y la empresa sin mostrar
  // el estado "Verificando sesión…".
  const refrescar = useCallback(async () => {
    if (!token) return

    try {
      setDatos(await llamarApi('/api/portal/sesion', { token }))
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 403) {
        cerrarSesion(AVISO_INVALIDA)
      }
    }
  }, [token, cerrarSesion])

  return (
    <SesionContext.Provider
      value={{
        estado,
        aviso,
        usuario: datos?.usuario,
        empresa: datos?.empresa,
        iniciarSesion,
        cerrarSesion,
        reintentar,
        llamar,
        refrescar,
      }}
    >
      {children}
    </SesionContext.Provider>
  )
}
