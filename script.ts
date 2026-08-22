import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Varun",
      email: "varun@rakshindia.com",
      posts: {
        create: {
          title: "My First Prisma Post",
          content: "Testing the database connection for AI Revenue Orchestrator",
          published: true,
        },
      },
    },
    include: {
      posts: true,
    },
  });
  console.log("Created user:", user);

  const allUsers = await prisma.user.findMany({
    include: { posts: true },
  });
  console.log("All users:", JSON.stringify(allUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });