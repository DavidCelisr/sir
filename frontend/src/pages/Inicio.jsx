import { useSesion } from '../auth/SesionContext.jsx'

// Pantalla de inicio: solo el saludo. La empresa y el rol están en el menú del círculo.
export default function Inicio() {
  const { usuario } = useSesion()
  return (
    <section>
      <h1>Bienvenido, {usuario.nombre}</h1>
    </section>
  )
}