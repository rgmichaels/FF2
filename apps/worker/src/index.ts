import { JobStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 2000);
let shuttingDown = false;

async function claimNextJob() {
  return prisma.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Job"
      WHERE status = 'QUEUED'
        AND "availableAt" <= NOW()
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    const next = jobs[0];
    if (!next) return null;

    return tx.job.update({
      where: { id: next.id },
      data: {
        status: JobStatus.RUNNING,
        startedAt: new Date(),
        attempts: { increment: 1 }
      }
    });
  });
}

async function executeJob(job: { id: string; type: string }) {
  if (job.type !== "HELLO_WORLD") {
    throw new Error(`Unsupported job type: ${job.type}`);
  }

  console.log(`[worker] Hello from job ${job.id}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    message: "Hello from the FF2 worker",
    workerPid: process.pid,
    completedAt: new Date().toISOString()
  };
}

async function processOneJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`[worker] Claimed ${job.id} (${job.type})`);

  try {
    const result = await executeJob(job);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        error: null
      }
    });

    console.log(`[worker] Completed ${job.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        error: message,
        completedAt: new Date()
      }
    });

    console.error(`[worker] Failed ${job.id}: ${message}`);
  }

  return true;
}

async function run() {
  console.log(`[worker] FF2 worker started; polling every ${pollIntervalMs}ms`);

  while (!shuttingDown) {
    const processed = await processOneJob();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] Received ${signal}; shutting down`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

run().catch(async (error) => {
  console.error("[worker] Fatal error", error);
  await prisma.$disconnect();
  process.exit(1);
});
