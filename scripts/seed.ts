import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length > 0) {
    console.log("Already initialized");
    process.exit(0);
  }

  const hashed = await hashPassword("admin123");
  await db.insert(users).values({
    username: "admin",
    password: hashed,
    role: "admin",
    balance: "0",
    status: "active",
  });

  console.log("Admin user created: admin / admin123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
