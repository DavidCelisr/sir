// Los textos legales viven en src/legal/*.md. El sufijo ?raw le pide a Vite
// que los importe como texto, sin procesarlos.
import juridica from '../legal/persona-juridica.md?raw'
import natural from '../legal/persona-natural.md?raw'

// Texto que se muestra y aviso de aceptación según el tipo de afiliación.
// No hay casilla: al continuar se entiende aceptado, y no se registra en la base de datos.
export const LEGAL = {
  PERSONA_JURIDICA: {
    documentos: juridica,
    aviso:
      'Al continuar, acepto los Términos y Condiciones de Uso de SIR y confirmo que he leído y autorizo el ' +
      'tratamiento de mis datos personales y/o de la entidad que represento, conforme a la Autorización para el ' +
      'Tratamiento de Datos Personales, la Declaración sobre el Tratamiento de Datos de Terceros y la Autorización ' +
      'para el Envío de Comunicaciones Comerciales.',
  },
  PERSONA_NATURAL: {
    documentos: natural,
    aviso:
      'Al continuar, acepto los Términos y Condiciones de Uso de SIR y confirmo que he leído y ' +
      'autorizo el tratamiento de mis datos personales, conforme a la Autorización para el Tratamiento de Datos ' +
      'Personales, la Declaración sobre el Tratamiento de Datos de Terceros y la Autorización para el Envío de ' +
      'Comunicaciones Comerciales.',
  },
}