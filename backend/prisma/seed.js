import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const nombreUsuario = process.env.SUPERADMIN_USUARIO;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!nombreUsuario || !password) {
    throw new Error('Faltan SUPERADMIN_USUARIO o SUPERADMIN_PASSWORD en el .env');
  }

  // Solo existe un superadministrador
  const existentes = await prisma.superadministrador.count();
  if (existentes > 0) {
    console.log('El superadministrador ya existe. No se hace ningún cambio.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.superadministrador.create({
    data: { nombreUsuario, passwordHash },
  });

  console.log(`Superadministrador "${nombreUsuario}" creado.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());