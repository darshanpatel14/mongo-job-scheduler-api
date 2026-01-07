import { MongoClient } from "mongodb";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "scheduler";

async function clearJobs() {
  console.log("🚀 Connecting to MongoDB...");
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const result = await db.collection("scheduler_jobs").deleteMany({});
    console.log(`✅ Cleared ${result.deletedCount} jobs from the database`);
  } catch (error) {
    console.error("❌ Error clearing jobs:", error);
  } finally {
    await client.close();
    console.log("👋 Connection closed");
  }
}

clearJobs().catch(console.error);
