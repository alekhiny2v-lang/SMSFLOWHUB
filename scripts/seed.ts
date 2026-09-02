import "dotenv/config";
import { ensureAdmin, ADMIN_PASSWORD } from "../src/lib/bootstrap";

async function main() {
  const result = await ensureAdmin();

  if (result.created) {
    console.log(`Admin user created: ${result.username} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin user already exists: ${result.username}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
