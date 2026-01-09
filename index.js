import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import { Scheduler, MongoJobStore } from "mongo-job-scheduler";

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "scheduler";

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
let scheduler;
let jobStore;
let db;

async function initScheduler() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DB_NAME);

  jobStore = new MongoJobStore(db);
  scheduler = new Scheduler({
    store: jobStore,
    workers: 3,
    pollIntervalMs: 1000,
    handler: async (job) => {
      console.log(`Executing job: ${job.name}`, job.data);
      // Your job handlers here
      // Example: if (job.name === 'send-email') { ... }
    },
  });

  await scheduler.start();
  console.log("✅ Scheduler started");
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get all jobs with optional filters
app.get("/jobs", async (req, res) => {
  try {
    const {
      status,
      name,
      limit = 100,
      skip = 0,
      sort = "updatedAt",
      order = "desc",
    } = req.query;

    const query = {
      ...(status && {
        status: status.includes(",") ? status.split(",") : status,
      }),
      ...(name && { name }),
      limit: Number(limit),
      skip: Number(skip),
      sort: { field: sort, order },
    };

    const jobs = await scheduler.getJobs(query);
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Get job statistics (MUST be before /jobs/:id to avoid matching "stats" as an ID)
app.get("/jobs/stats", async (req, res) => {
  try {
    const allJobs = await scheduler.getJobs({ limit: 10000 });

    const stats = {
      total: allJobs.length,
      pending: allJobs.filter((j) => j.status === "pending").length,
      running: allJobs.filter((j) => j.status === "running").length,
      completed: allJobs.filter((j) => j.status === "completed").length,
      failed: allJobs.filter((j) => j.status === "failed").length,
      cancelled: allJobs.filter((j) => j.status === "cancelled").length,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get job by ID
app.get("/jobs/:id", async (req, res) => {
  try {
    const job = await scheduler.getJob(new ObjectId(req.params.id));
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// Cancel a job
app.post("/jobs/:id/cancel", async (req, res) => {
  try {
    await scheduler.cancel(new ObjectId(req.params.id));
    res.json({ message: "Job cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling job:", error);
    res.status(500).json({ error: "Failed to cancel job" });
  }
});

// Retry a failed job
app.post("/jobs/:id/retry", async (req, res) => {
  try {
    const job = await scheduler.getJob(new ObjectId(req.params.id));
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Update job to retry
    await scheduler.updateJob(new ObjectId(req.params.id), {
      nextRunAt: new Date(),
      attempts: 0,
    });

    res.json({ message: "Job retry scheduled" });
  } catch (error) {
    console.error("Error retrying job:", error);
    res.status(500).json({ error: "Failed to retry job" });
  }
});

// Delete a job
app.delete("/jobs/:id", async (req, res) => {
  try {
    // await scheduler.cancel(new ObjectId(req.params.id));
    const result = await db
      .collection("scheduler_jobs")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Create a new job
app.post("/jobs", async (req, res) => {
  try {
    const { name, data, runAt, repeat, retry, priority, concurrency } =
      req.body;

    const job = await scheduler.schedule({
      name,
      data,
      runAt: runAt ? new Date(runAt) : undefined,
      repeat,
      retry,
      priority,
      concurrency,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Edit a job
app.put("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, repeat, runAt, retry, priority, concurrency } = req.body;

    // Check if job exists
    const existingJob = await scheduler.getJob(new ObjectId(id));
    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const updates = {};
    if (data !== undefined) updates.data = data;
    if (repeat !== undefined) updates.repeat = repeat;
    if (retry !== undefined) updates.retry = retry;
    if (priority !== undefined) updates.priority = priority;
    if (concurrency !== undefined) updates.concurrency = concurrency;
    // Update nextRunAt only if runAt is provided
    if (runAt) {
      updates.nextRunAt = new Date(runAt);
    }

    await scheduler.updateJob(new ObjectId(id), updates);

    // Return the updated job
    const updatedJob = await scheduler.getJob(new ObjectId(id));
    res.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Failed to update job" });
  }
});

// Start server
initScheduler()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:5173`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize scheduler:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await scheduler.stop({ graceful: true, timeoutMs: 5000 });
  process.exit(0);
});
