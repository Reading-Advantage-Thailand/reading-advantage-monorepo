// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with fake users...");

  // First, create roles if they don't exist
  // const teacherRole = await prisma.role.upsert({
  //   where: { name: "Teacher" },
  //   update: {},
  //   create: { name: "TEACHER" },
  // });

  // const studentRole = await prisma.role.upsert({
  //   where: { name: "Student" },
  //   update: {},
  //   create: { name: "STUDENT" },
  // });

  // const adminRole = await prisma.role.upsert({
  //   where: { name: "ADMIN" },
  //   update: {},
  //   create: { name: "ADMIN" },
  // });

  // const systemRole = await prisma.role.upsert({
  //   where: { name: "system" },
  //   update: {},
  //   create: { name: "system" },
  // });

  const usersToCreate = 2; // You can change this number
  const saltRounds = 10;

  for (let i = 0; i < usersToCreate; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({
      firstName,
      lastName,
    });

    // Generate a simple, consistent password for testing.
    // For example, "password123" for all users.
    const fakePassword = "asdfasdf";

    const hashedPassword = await bcrypt.hash(fakePassword, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: email,
        name: `${firstName} ${lastName}`,
        password: hashedPassword,
      },
    });

    // Assign TEACHER role to the user
    // await prisma.userRole.create({
    //   data: {
    //     userId: user.id,
    //     roleId: teacherRole.id,
    //   },
    // });
  }

  console.log("Database seeded successfully!");
}

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
