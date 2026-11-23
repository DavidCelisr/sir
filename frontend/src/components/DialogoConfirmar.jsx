import { useEffect, useRef } from 'react'

// Diálogo reutilizable que controla su apertura y cierre y permite confirmar acciones.
export default function DialogoConfirmar({
  abierto, titulo, children, error, enviando = false,
  textoConfirmar = 'Confirmar', onConfirmar, onCancelar,
}) {
  const dialogo = useRef(null)

  // Se abre y se cierra según la propiedad 'abierto'
  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-dialogo"
      // Esc dispara "cancel": se evita que el navegador lo cierre solo, para que el
      // estado de quien lo usa siga siendo la única fuente de verdad. Mientras envía no se cierra.
      onCancel={(e) => { e.preventDefault(); if (!enviando) onCancelar() }}
    >
      <h2 id="titulo-dialogo">{titulo}</h2>
      {children}

      {error && <div className="alerta" role="alert">{error}</div>}

      <div className="acciones">
        {/* Cancelar va primero: el foco inicial queda en la opción segura */}
        <button type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button type="button" onClick={onConfirmar} disabled={enviando}>
          {enviando ? 'Procesando…' : textoConfirmar}
        </button>
      </div>
    </dialog>
  )
}