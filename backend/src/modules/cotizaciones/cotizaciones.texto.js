// Textos fijos de la cotización. Viven AQUÍ (y no en el frontend) para que la pantalla de
// impresión y el correo muestren exactamente lo mismo: el detalle los devuelve y el correo los usa.

// texto legal. Debe ir completo y sin cambios en toda cotización entregada.
export const TEXTO_LEGAL =
  'La presente cotización corresponde a una estimación realizada con base en el diagnóstico y las ' +
  'condiciones conocidas al momento de su elaboración. Los valores y condiciones indicados corresponden ' +
  'a la información disponible en la fecha de emisión y pueden variar cuando existan cambios en las ' +
  'condiciones del servicio, disponibilidad o precio de los repuestos, o cuando durante la ejecución se ' +
  'identifiquen necesidades adicionales. Cualquier modificación al alcance o valor del servicio deberá ser ' +
  'informada y, cuando corresponda, contar con la aceptación del cliente antes de su ejecución.';

// el total no incluye IVA. Es una nota aparte: NO forma parte del texto legal.
export const NOTA_IVA = 'La factura agrega el IVA según el tipo de empresa';

// Número de cotización para mostrar: 123 -> "COT-000123" (formato provisional)
export const codigoCotizacion = (numero) => `COT-${String(numero).padStart(6, '0')}`;

// "285000" -> "$ 285.000" ; "120000.5" -> "$ 120.000,50". Solo para el texto del correo.
const pesos = (valor) => {
  const cifra = Number(valor);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: Number.isInteger(cifra) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cifra);
};

// Cuerpo del correo (simulado en la consola hasta definir el proveedor). 'c' es el detalle de la cotización.
export function textoDelCorreo(c, nombreEmpresa) {
  const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(c.fecha));
  const lineas = c.lineas.map((l) =>
    l.tipo === 'PIEZA'
      ? `- ${l.descripcion} (${l.cantidad} × ${pesos(l.precioUnitario)}): ${pesos(l.subtotal)}`
      : `- ${l.descripcion}: ${pesos(l.subtotal)}`,
  );

  return [
    nombreEmpresa,
    `Cotización ${c.codigo}`,
    `Fecha: ${fecha}`,
    '',
    `Cliente: ${c.cliente.nombre}`,
    `Documento: ${c.cliente.numeroDocumento}`,
    `Ciudad del servicio: ${c.ciudadServicio}`,
    '',
    'Diagnóstico:',
    c.diagnostico,
    '',
    'Detalle:',
    ...lineas,
    '',
    `Total estimado: ${pesos(c.total)}`,
    c.notaIva,
    '',
    c.textoLegal,
  ].join('\n');
}