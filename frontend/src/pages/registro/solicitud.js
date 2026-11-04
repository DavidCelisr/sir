// Ordena los datos planos del formulario en la forma que espera el backend:
// POST /api/registro/empresas -> { token, tipoAfiliacion, empresa, responsable }
export function armarSolicitud(token, afiliacion, d) {
  const esJuridica = afiliacion === 'PERSONA_JURIDICA'

  // Datos del responsable: representante legal (jurídica) o la propia persona (natural)
  const responsable = {
    nombres: d.nombres,
    apellidos: d.apellidos,
    tipoDocumento: d.tipoDocumento,
    numeroDocumento: d.numeroDocumento,
    fechaExpedicion: d.fechaExpedicion,
    telefono: d.telefono,
    correo: d.correo,
    direccion: d.direccion,
  }

  // Solo la persona natural responde estos datos adicionales
  if (!esJuridica) {
    Object.assign(responsable, {
      nacionalidad1: d.nacionalidad1,
      nacionalidad2: d.nacionalidad2,
      paisNacimiento: d.paisNacimiento,
      ciudadNacimiento: d.ciudadNacimiento,
      profesionOcupacion: d.profesionOcupacion,
    })
  }

  // En persona natural el documento de la empresa lo deduce el backend (D-02)
  const empresa = esJuridica
    ? {
        numeroIdentificacion: d.numeroIdentificacion,
        digitoVerificacion: d.digitoVerificacion,
        consecutivo: d.consecutivo,
        razonSocial: d.razonSocial,
        departamento: d.departamento,
        ciudad: d.ciudad,
      }
    : { departamento: d.departamento, ciudad: d.ciudad }

  return { token, tipoAfiliacion: afiliacion, empresa, responsable }
}