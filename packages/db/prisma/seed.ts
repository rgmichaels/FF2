import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const job = await prisma.job.create({
    data: {
      type: "HELLO_WORLD",
      payload: {
        source: "seed"
      }
    }
  });

  console.log(`Queued HELLO_WORLD job ${job.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
