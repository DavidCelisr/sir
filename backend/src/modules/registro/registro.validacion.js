import prismaClient from '@prisma/client';

// Los enums del esquema, para no repetir las listas a mano
const { TipoDocumento, TipoAfiliacion } = prismaClient;

const limpiar = (v) => (typeof v === 'string' ? v.trim() : '');
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Revisa el cuerpo de la petición y lo deja listo para guardar.
// Devuelve { errores } si algo está mal.
export function validarRegistro(body = {}) {
  const errores = [];

  // Texto obligatorio: lo limpia y anota el error si viene vacío
  const requerido = (valor, nombre) => {
    const texto = limpiar(valor);
    if (!texto) errores.push(`${nombre} es obligatorio`);
    return texto;
  };

  const token = requerido(body.token, 'token');
  const tipoAfiliacion = body.tipoAfiliacion;

  // Sin el tipo de afiliación no se sabe qué más pedir
  if (!Object.values(TipoAfiliacion).includes(tipoAfiliacion)) {
    errores.push('tipoAfiliacion debe ser PERSONA_NATURAL o PERSONA_JURIDICA');
    return { errores };
  }

  const esJuridica = tipoAfiliacion === TipoAfiliacion.PERSONA_JURIDICA;
  const e = body.empresa ?? {};
  const r = body.responsable ?? {};

  // --- Responsable: representante legal (jurídica) o la propia persona (natural) ---
  const responsable = {
    nombres: requerido(r.nombres, 'responsable.nombres'),
    apellidos: requerido(r.apellidos, 'responsable.apellidos'),
    tipoDocumento: r.tipoDocumento,
    numeroDocumento: requerido(r.numeroDocumento, 'responsable.numeroDocumento'),
    telefono: requerido(r.telefono, 'responsable.telefono'),
    correo: requerido(r.correo, 'responsable.correo'),
    direccion: requerido(r.direccion, 'responsable.direccion'),
  };

  if (!Object.values(TipoDocumento).includes(responsable.tipoDocumento)) {
    errores.push('responsable.tipoDocumento no es un tipo de documento válido');
  }
  if (responsable.correo && !correoValido(responsable.correo)) {
    errores.push('responsable.correo no tiene un formato válido');
  }

  // Fecha de expedición: formato AAAA-MM-DD y no puede ser futura
  const fecha = new Date(r.fechaExpedicion);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fechaExpedicion ?? '') || isNaN(fecha) || fecha > new Date()) {
    errores.push('responsable.fechaExpedicion debe tener formato AAAA-MM-DD y no ser futura');
  }
  responsable.fechaExpedicion = fecha;

  // --- Empresa ---
  const departamento = requerido(e.departamento, 'empresa.departamento');
  const ciudad = requerido(e.ciudad, 'empresa.ciudad');
  let empresa;

  if (esJuridica) {
    empresa = {
      tipoAfiliacion,
      tipoIdentificacion: TipoDocumento.NIT, // en jurídica siempre es NIT
      numeroIdentificacion: requerido(e.numeroIdentificacion, 'empresa.numeroIdentificacion'),
      digitoVerificacion: requerido(e.digitoVerificacion, 'empresa.digitoVerificacion'),
      consecutivo: limpiar(e.consecutivo) || null, // el único campo opcional
      razonSocial: requerido(e.razonSocial, 'empresa.razonSocial'),
      departamento,
      ciudad,
    };
  } else {
    // Persona natural: el documento de la empresa ES el de la persona (D-02)
    empresa = {
      tipoAfiliacion,
      tipoIdentificacion: responsable.tipoDocumento,
      numeroIdentificacion: responsable.numeroDocumento,
      departamento,
      ciudad,
    };
    // Datos adicionales que solo se piden a la persona natural
    responsable.nacionalidad1 = requerido(r.nacionalidad1, 'responsable.nacionalidad1');
    responsable.nacionalidad2 = limpiar(r.nacionalidad2) || null; // ver D-07
    responsable.paisNacimiento = requerido(r.paisNacimiento, 'responsable.paisNacimiento');
    responsable.ciudadNacimiento = requerido(r.ciudadNacimiento, 'responsable.ciudadNacimiento');
    responsable.profesionOcupacion = requerido(r.profesionOcupacion, 'responsable.profesionOcupacion');
  }

  return { errores, token, empresa, responsable };
}