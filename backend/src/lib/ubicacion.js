import { readFileSync } from 'node:fs';

// Departamentos y municipios de Colombia (DIVIPOLA, DANE). Es una COPIA de frontend/src/data/colombia.json:
// si se regenera esa lista, hay que copiarla aquí también.
const colombia = JSON.parse(readFileSync(new URL('../data/colombia.json', import.meta.url), 'utf8'));
const MUNICIPIOS = new Map(colombia.map((d) => [d.departamento, new Set(d.municipios)]));

// Revisa un par departamento + ciudad. Los dos son opcionales, pero si se diligencia uno, el otro
// también, y la ciudad debe pertenecer al departamento. Devuelve el mensaje de error, o null si todo está bien.
// 'prefijo' es el nombre del objeto en el mensaje ("cliente" -> "cliente.ciudad"); puede ir vacío.
export function errorUbicacion(departamento, ciudad, prefijo = '') {
  const campo = (nombre) => (prefijo ? `${prefijo}.${nombre}` : nombre);

  if (!departamento && !ciudad) return null; // los dos vacíos: permitido
  if (!departamento || !ciudad) {
    return `${campo('departamento')} y ${campo('ciudad')} deben diligenciarse juntos`;
  }
  const municipios = MUNICIPIOS.get(departamento);
  if (!municipios) return `${campo('departamento')} no es un departamento válido`;
  if (!municipios.has(ciudad)) return `${campo('ciudad')} no pertenece al departamento ${departamento}`;
  return null;
}