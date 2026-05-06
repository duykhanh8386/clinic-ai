import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ROOT_ADMIN_EMAIL;
  const password = process.env.ROOT_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Seed skipped: ROOT_ADMIN_EMAIL / ROOT_ADMIN_PASSWORD not set.");
    return;
  }

  const existed = await prisma.user.findUnique({ where: { email } });

  if (existed) {
    if (existed.role !== "ADMIN") {
      await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
      console.log("Updated existing user to ADMIN:", email);
    } else {
      console.log("Root admin already exists:", email);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      fullName: "Root Admin",
      isActive: true,
    },
  });

  console.log("Created root admin:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });