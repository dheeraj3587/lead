/* eslint-disable no-console */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const minimist = require("minimist");
require("dotenv").config();
// Force Atlas cluster for seeding if not explicitly provided
if (
  !process.env.MONGO_URI ||
  /mongodb:\/\/(localhost|127\.0\.0\.1)/i.test(process.env.MONGO_URI)
) {
  process.env.MONGO_URI =
    "mongodb+srv://dheeraj8782:munnu@cluster0.nn1re.mongodb.net/erino_leads?retryWrites=true&w=majority&appName=Cluster0";
}

// Adjust paths based on your backend structure
const connectDB = require("../config/database");
const User = require("../models/User");
const Lead = require("../models/Lead");

// CLI and env configuration
const argv = minimist(process.argv.slice(2));
const TEST_EMAIL =
  argv.email || process.env.SEED_TEST_EMAIL || "test@leadmanagement.com";
const TEST_PASSWORD =
  argv.password || process.env.SEED_TEST_PASSWORD || "TestUser123!";
const TEST_NAME = {
  firstName: argv.first || process.env.SEED_TEST_FIRST || "Test",
  lastName: argv.last || process.env.SEED_TEST_LAST || "User",
};
const N = Number(argv.count || process.env.SEED_COUNT || 150);
const batchSize = Number(argv.batch || process.env.SEED_BATCH || 50);
const CLEAN_ONLY = argv.clean || argv["clean-only"] || false;
const SHOW_PASSWORD =
  argv["show-password"] || argv["show-credentials"] || false;

const statuses = [
  { value: "new", weight: 40 },
  { value: "contacted", weight: 25 },
  { value: "qualified", weight: 20 },
  { value: "lost", weight: 10 },
  { value: "won", weight: 5 },
];

const sources = [
  { value: "website", weight: 30 },
  { value: "google_ads", weight: 20 },
  { value: "facebook_ads", weight: 20 },
  { value: "referral", weight: 15 },
  { value: "events", weight: 10 },
  { value: "other", weight: 5 },
];

function weightedPick(arr) {
  const total = arr.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of arr) {
    if ((r -= a.weight) <= 0) return a.value;
  }
  return arr[arr.length - 1].value;
}

function createLead(i, userId) {
  const status = weightedPick(statuses);
  const source = weightedPick(sources);
  const s1 = faker.number.int({ min: 40, max: 100 });
  const s2 = faker.number.int({ min: 0, max: 80 });
  const score = Math.min(100, Math.max(0, Math.round(s1 * 0.6 + s2 * 0.4)));
  // Realistic lead value between $100 and $100,000 using a skewed distribution
  const leadValue = faker.number.int({ min: 100, max: 100000 });
  const createdAt = faker.date.recent({ days: 180 });
  const hasActivity = Math.random() < 0.6;
  const lastActivityAt = hasActivity
    ? faker.date.between({ from: createdAt, to: new Date() })
    : null;
  const isQualified =
    ["qualified", "won"].includes(status) || Math.random() < 0.2;
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    // Ensure unique email per lead for this seed run by appending index
    email: faker.internet
      .email({ firstName: `lead${i}`, lastName: faker.person.lastName() })
      .toLowerCase(),
    phone: faker.phone.number("+1##########"),
    company: faker.company.name(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    source,
    status,
    score,
    leadValue,
    lastActivityAt,
    createdBy: userId,
    createdAt,
    updatedAt: createdAt,
    isQualified,
  };
}

async function main() {
  await connectDB();
  console.log("Connected to database");

  try {
    // Ensure user
    let user = await User.findOne({ email: TEST_EMAIL });
    if (!user && !CLEAN_ONLY) {
      // Create via model to trigger pre-save hooks (hashing)
      user = new User({
        firstName: TEST_NAME.firstName,
        lastName: TEST_NAME.lastName,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      await user.save();
      console.log(`Created test user: ${TEST_EMAIL}`);
    } else if (user) {
      console.log(`Using existing test user: ${TEST_EMAIL}`);
    }

    if (!user && CLEAN_ONLY) {
      console.log("No test user found to clean. Exiting.");
      return;
    }

    // Cleanup leads for user
    await Lead.deleteMany({ createdBy: user._id });
    console.log("Removed existing leads for test user");

    if (CLEAN_ONLY) {
      console.log("Clean completed");
      return;
    }

    // Generate leads
    const leads = [];
    for (let i = 0; i < N; i++) {
      leads.push(createLead(i, user._id));
    }

    // Insert in batches sequentially.
    // Note: Sequential insertion is simple and prevents overwhelming the database,
    // but can be slower for large datasets. For higher throughput, you could parallelize
    // with Promise.allSettled and use insertMany({ ordered: false }). That increases complexity
    // and DB load, and you must handle partial failures and retries explicitly.
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      // eslint-disable-next-line no-await-in-loop
      await Lead.insertMany(batch, { ordered: true });
      console.log(
        `Inserted ${Math.min(i + batchSize, leads.length)} / ${leads.length}`,
      );
    }

    console.log("Seeding complete");
    console.log("Test user credentials:");
    console.log(`  Email: ${TEST_EMAIL}`);
    if (SHOW_PASSWORD) {
      console.log(`  Password: ${TEST_PASSWORD}`);
    } else {
      console.log("  Password: (hidden) use --show-password to display");
    }
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
  }
}

main();
