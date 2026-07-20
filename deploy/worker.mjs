/**
 * Worker InvoicePilot — heartbeat + surveillance PipelineJob PENDING.
 * Les jobs pipeline sont aujourd’hui surtout créés en SUCCEEDED (ingest sync).
 * Ce worker prépare la file async : log + marquage timeout des RUNNING trop vieux.
 *
 * Lancer : node deploy/worker.mjs (image app)
 */
import { PrismaClient } from "@prisma/client";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 60_000);
const STALE_RUNNING_MIN = Number(process.env.WORKER_STALE_RUNNING_MIN ?? 30);

const db = new PrismaClient();

function log(msg, extra) {
  const line = `[worker] ${new Date().toISOString()} ${msg}`;
  if (extra !== undefined) console.log(line, extra);
  else console.log(line);
}

async function tick() {
  const pending = await db.pipelineJob.count({ where: { status: "PENDING" } });
  const running = await db.pipelineJob.count({ where: { status: "RUNNING" } });

  const staleBefore = new Date(Date.now() - STALE_RUNNING_MIN * 60_000);
  const stale = await db.pipelineJob.updateMany({
    where: { status: "RUNNING", updatedAt: { lt: staleBefore } },
    data: {
      status: "FAILED",
      error: `Timeout worker (>${STALE_RUNNING_MIN} min RUNNING)`,
      finishedAt: new Date(),
    },
  });

  log(`heartbeat pending=${pending} running=${running} staleFailed=${stale.count}`);

  // Préparation file async : les PENDING restent en attente d’un handler métier.
  // Quand VALIDATE / SUBMIT seront asynchrones, brancher ici le dispatch.
  if (pending > 0) {
    const sample = await db.pipelineJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, stage: true, direction: true, organizationId: true },
    });
    log("pending sample", sample);
  }
}

async function main() {
  log("ready — poll PipelineJob + stale RUNNING");
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error("[worker] tick error", err);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
