import colombia from '../data/colombia.json'

// Verifica si departamento y ciudad coinciden con las listas; las sedes antiguas pueden tener texto libre.
export const ubicacionValida = (departamento, ciudad) => {
  const encontrado = colombia.find((d) => d.departamento === departamento)
  return Boolean(encontrado && encontrado.municipios.includes(ciudad))
}