import { MongoClient } from "mongodb";
import { Scheduler, MongoJobStore } from "mongo-job-scheduler";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "scheduler";

async function generateJobs() {
  console.log("🚀 Connecting to MongoDB...");
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  const jobStore = new MongoJobStore(db);
  const scheduler = new Scheduler({
    store: jobStore,
    workers: 3,
    pollIntervalMs: 1000,
    handler: async (job) => {
      console.log(`Processing: ${job.name}`);
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
  });

  await scheduler.start();
  console.log("✅ Scheduler connected\n");

  try {
    // ========================================
    // 1. EMAIL JOBS (Pending Status)
    // ========================================
    console.log("📧 Creating Email Jobs (Pending)...");

    const emailTemplates = [
      { type: "welcome", subject: "Welcome to our platform!" },
      { type: "verification", subject: "Verify your email address" },
      { type: "password-reset", subject: "Reset your password" },
      { type: "newsletter", subject: "Weekly newsletter digest" },
      { type: "notification", subject: "You have new notifications" },
    ];

    const emailTimestamp = Date.now();
    for (let i = 0; i < 10; i++) {
      const template = emailTemplates[i % emailTemplates.length];
      await scheduler.schedule({
        name: "send-email",
        data: {
          to: `user${i + 1}@example.com`,
          template: template.type,
          subject: template.subject,
          userId: `user-${1000 + i}`,
        },
        runAt: new Date(Date.now() + (i + 1) * 60000), // Staggered 1 min apart
        dedupeKey: `email-${emailTimestamp}-${i}`,
      });
    }
    console.log("  ✓ Created 10 pending email jobs\n");

    // ========================================
    // 2. DAILY REPORTS (Cron Jobs)
    // ========================================
    console.log("📊 Creating Daily Report Jobs (Cron)...");

    const reportTypes = [
      { name: "sales-report", cron: "0 9 * * *", desc: "Daily at 9 AM" },
      { name: "analytics-report", cron: "0 18 * * *", desc: "Daily at 6 PM" },
      {
        name: "user-activity-report",
        cron: "0 0 * * *",
        desc: "Daily at midnight",
      },
      { name: "inventory-report", cron: "0 12 * * *", desc: "Daily at noon" },
      { name: "financial-summary", cron: "0 23 * * *", desc: "Daily at 11 PM" },
    ];

    for (const report of reportTypes) {
      await scheduler.schedule({
        name: report.name,
        data: {
          reportType: report.name,
          format: "pdf",
          recipients: ["admin@example.com", "manager@example.com"],
        },
        repeat: { cron: report.cron },
        dedupeKey: `report-${report.name}`,
      });
    }
    console.log("  ✓ Created 5 cron-based report jobs\n");

    // ========================================
    // 3. CLEANUP TASKS (Interval Jobs)
    // ========================================
    console.log("🧹 Creating Cleanup Tasks (Interval)...");

    const cleanupTasks = [
      { name: "cleanup-temp-files", interval: 3600000, desc: "Every 1 hour" },
      { name: "cleanup-old-sessions", interval: 1800000, desc: "Every 30 min" },
      {
        name: "cleanup-expired-tokens",
        interval: 600000,
        desc: "Every 10 min",
      },
      { name: "cleanup-logs", interval: 86400000, desc: "Every 24 hours" },
      { name: "cleanup-cache", interval: 300000, desc: "Every 5 min" },
    ];

    for (const task of cleanupTasks) {
      await scheduler.schedule({
        name: task.name,
        data: {
          taskType: task.name,
          description: task.desc,
        },
        repeat: { every: task.interval },
        dedupeKey: `cleanup-${task.name}`,
      });
    }
    console.log("  ✓ Created 5 interval-based cleanup tasks\n");

    // ========================================
    // 4. PAYMENT JOBS (With Retry Logic)
    // ========================================
    console.log("💳 Creating Payment Jobs (With Retry)...");

    for (let i = 0; i < 15; i++) {
      const paymentId = `PAY-${10000 + i}`;
      await scheduler.schedule({
        name: "process-payment",
        data: {
          paymentId,
          amount: Math.floor(Math.random() * 50000) + 1000,
          currency: "USD",
          userId: `user-${2000 + i}`,
          method: ["card", "paypal", "bank_transfer"][i % 3],
        },
        runAt: new Date(Date.now() + Math.random() * 300000), // Random within 5 min
        retry: {
          maxAttempts: 5,
          backoff: { type: "exponential", delay: 2000 },
        },
        dedupeKey: `payment-${paymentId}`,
      });
    }
    console.log("  ✓ Created 15 payment jobs with retry logic\n");

    // ========================================
    // 5. SMS JOBS (Bulk Processing)
    // ========================================
    console.log("📱 Creating SMS Jobs (Bulk)...");

    const smsCategories = [
      "otp",
      "marketing",
      "alert",
      "reminder",
      "confirmation",
    ];

    for (let i = 0; i < 20; i++) {
      const batchId = `BATCH-${Math.floor(i / 5)}`;
      await scheduler.schedule({
        name: "send-sms",
        data: {
          phoneNumber: `+1-555-${String(1000 + i).padStart(4, "0")}`,
          message: `Your verification code is ${Math.floor(
            100000 + Math.random() * 900000
          )}`,
          category: smsCategories[i % smsCategories.length],
          batchId,
        },
        runAt: new Date(Date.now() + Math.floor(i / 5) * 30000), // Batches of 5 every 30s
        dedupeKey: `sms-${batchId}-${i}`,
      });
    }
    console.log("  ✓ Created 20 SMS jobs in bulk batches\n");

    // ========================================
    // 6. INVENTORY SYNC (With Deduplication)
    // ========================================
    console.log("📦 Creating Inventory Sync Jobs (With Deduplication)...");

    const warehouses = ["WH-NY", "WH-LA", "WH-CHI", "WH-SF", "WH-MIA"];

    for (let i = 0; i < warehouses.length; i++) {
      const warehouse = warehouses[i];

      // Create recurring sync job
      await scheduler.schedule({
        name: "inventory-sync",
        data: {
          warehouse,
          syncType: "full",
        },
        repeat: { every: 3600000 }, // Every hour
        dedupeKey: `inventory-sync-${warehouse}`, // Prevents duplicates
      });

      // Create some one-time sync jobs
      await scheduler.schedule({
        name: "inventory-sync",
        data: {
          warehouse,
          syncType: "delta",
          productIds: Array.from(
            { length: 10 },
            (_, idx) => `PROD-${i * 100 + idx}`
          ),
        },
        runAt: new Date(Date.now() + (i + 1) * 120000), // Staggered 2 min apart
        dedupeKey: `inventory-delta-${warehouse}-${Date.now()}`,
      });
    }
    console.log("  ✓ Created inventory sync jobs with deduplication\n");

    // ========================================
    // BONUS: Mixed scenarios
    // ========================================
    console.log("🎯 Creating Additional Scenario Jobs...");

    // Job with long delay
    await scheduler.schedule({
      name: "quarterly-backup",
      data: { type: "full-database-backup" },
      runAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      dedupeKey: `backup-quarterly-${Date.now()}`,
    });

    // Job that should run immediately
    await scheduler.schedule({
      name: "urgent-notification",
      data: { priority: "high", message: "System maintenance alert" },
      runAt: new Date(Date.now() + 5000), // 5 seconds
      dedupeKey: `urgent-${Date.now()}`,
    });

    // Complex cron job
    await scheduler.schedule({
      name: "weekly-report",
      data: { reportType: "weekly-summary" },
      repeat: { cron: "0 8 * * 1" }, // Every Monday at 8 AM
      dedupeKey: "weekly-report-cron",
    });

    console.log("  ✓ Created additional scenario jobs\n");

    // Summary
    console.log("=====================================");
    console.log("✨ JOB GENERATION COMPLETE!");
    console.log("=====================================");
    console.log("📊 Summary:");
    console.log("  • 10 Email jobs (pending)");
    console.log("  • 5 Daily report jobs (cron)");
    console.log("  • 5 Cleanup tasks (interval)");
    console.log("  • 15 Payment jobs (with retry)");
    console.log("  • 20 SMS jobs (bulk)");
    console.log("  • 10 Inventory sync jobs (with deduplication)");
    console.log("  • 3 Additional scenario jobs");
    console.log("  ─────────────────────────────");
    console.log("  📈 Total: 68 jobs created");
    console.log("=====================================\n");

    console.log("🎉 You can now view these jobs in your frontend dashboard!");
    console.log("🌐 Dashboard: http://localhost:5173\n");
  } catch (error) {
    console.error("❌ Error generating jobs:", error);
  } finally {
    await scheduler.stop({ graceful: true, timeoutMs: 5000 });
    await client.close();
    console.log("👋 Connection closed");
  }
}

// Run the generator
generateJobs().catch(console.error);
