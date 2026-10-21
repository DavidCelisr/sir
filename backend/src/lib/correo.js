// Servicio de correo SIMULADO. El proveedor no está definido en la
// arquitectura (pendiente), así que por ahora solo imprime en consola.
// Cuando se defina, solo se reemplaza el contenido de esta función.
export async function enviarCorreo({ para, asunto, texto }) {
  console.log('\n--- CORREO (simulado) ---');
  console.log(`Para: ${para}`);
  console.log(`Asunto: ${asunto}`);
  console.log(texto);
  console.log('-------------------------\n');
}