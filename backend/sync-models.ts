import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import { parse } from "toml";

const configPath = resolve(process.cwd(), "../config.toml");
const rawToml = readFileSync(configPath, "utf-8");
const config = parse(rawToml);

const gradingModels = config.grading_models || [];
console.log(`Found ${gradingModels.length} grading models in config.toml`);

const dbModels = gradingModels.map((model: any) => ({
  id: model.id ?? model.model,
  name: model.name,
  model: model.model,
  description: model.description,
  enabled: model.enabled !== false,
  premium: model.premium === true,
  features: model.features ?? [],
  advantages: model.advantages,
  usageScenario: model.usageScenario,
  warning: model.warning,
  supports_json_mode: model.supports_json_mode,
}));

for (const m of dbModels) {
  console.log(`  - ${m.id} [enabled=${m.enabled}, premium=${m.premium}]`);
}

const MONGO_HOST = process.env.MONGO_HOST || "192.168.3.2";
const MONGO_PORT = Number.parseInt(process.env.MONGO_PORT || "27017", 10);
const uri = `mongodb://${MONGO_HOST}:${MONGO_PORT}`;
const DB_NAME = "ink_battles";

console.log(`\nConnecting to ${uri}...`);
const client = new MongoClient(uri, { directConnection: true, serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(DB_NAME);
  const collection = db.collection("site_settings");

  const existing = await collection.findOne({ key: "ai.gradingModels" });
  if (existing) {
    console.log(`\nExisting DB record found, updatedAt: ${(existing as any).updatedAt}`);
    console.log(`Existing model count: ${(existing as any).value?.length ?? 0}`);
  } else {
    console.log("\nNo existing DB record for ai.gradingModels");
  }

  const now = new Date();
  const result = await collection.updateOne(
    { key: "ai.gradingModels" },
    {
      $set: {
        value: dbModels,
        updatedAt: now,
        updatedByUid: 0,
        updatedByLabel: "system",
      },
      $setOnInsert: {
        category: "content",
        createdAt: now,
      },
    },
    { upsert: true },
  );

  if (result.upsertedCount > 0) {
    console.log(`\nInserted new ai.gradingModels setting with ${dbModels.length} models`);
  } else if (result.modifiedCount > 0) {
    console.log(`\nUpdated ai.gradingModels setting to ${dbModels.length} models`);
  } else {
    console.log("\nNo changes needed - DB already matches config.toml");
  }

  // Verify
  const updated = await collection.findOne({ key: "ai.gradingModels" });
  console.log(`\nVerification: DB now has ${(updated as any).value?.length ?? 0} models`);
  for (const m of (updated as any).value ?? []) {
    console.log(`  - ${m.id} [enabled=${m.enabled}, premium=${m.premium}]`);
  }
} finally {
  await client.close();
  console.log("\nDone. Connection closed.");
}
