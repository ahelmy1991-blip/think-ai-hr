// Creates all HR-specific tables in Neon DB via raw SQL (safe — idempotent IF NOT EXISTS)
// Run: node scripts/create-new-tables.mjs
// NEVER use prisma db push — it would drop Petinder tables
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating / verifying HR tables via raw SQL...\n");

  // Core employee tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'L6',
      department TEXT NOT NULL DEFAULT 'Engineering',
      "isExpat" BOOLEAN NOT NULL DEFAULT false,
      nationality TEXT,
      "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'probation',
      "iqamaExpiry" TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_employees");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_onboarding_checklists (
      id TEXT PRIMARY KEY,
      "employeeId" TEXT NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
      phase TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("employeeId", phase)
    )
  `);
  console.log("✓ hr_onboarding_checklists");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_compliance_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      "employeeId" TEXT REFERENCES hr_employees(id) ON DELETE SET NULL,
      "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      "completedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_compliance_items");

  // ATS tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'Engineering',
      level TEXT NOT NULL DEFAULT 'L7',
      location TEXT NOT NULL DEFAULT 'Riyadh, KSA',
      "jobType" TEXT NOT NULL DEFAULT 'full-time',
      description TEXT NOT NULL,
      requirements JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'open',
      "targetCountries" JSONB NOT NULL DEFAULT '[]',
      "minYearsExp" INTEGER NOT NULL DEFAULT 3,
      "maxYearsExp" INTEGER NOT NULL DEFAULT 10,
      specialty TEXT NOT NULL DEFAULT '',
      "preferAIExp" BOOLEAN NOT NULL DEFAULT true,
      headcount INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_jobs");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_candidates (
      id TEXT PRIMARY KEY,
      "jobId" TEXT REFERENCES hr_jobs(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      "linkedinUrl" TEXT,
      "currentRole" TEXT,
      "currentCompany" TEXT,
      country TEXT,
      city TEXT,
      "yearsExperience" INTEGER,
      specialty TEXT,
      "culturalBackground" TEXT,
      "hasAICompanyExp" BOOLEAN NOT NULL DEFAULT false,
      "aiCompanies" JSONB NOT NULL DEFAULT '[]',
      skills JSONB NOT NULL DEFAULT '[]',
      education TEXT,
      languages JSONB NOT NULL DEFAULT '[]',
      "matchScore" FLOAT,
      "matchNotes" TEXT,
      stage TEXT NOT NULL DEFAULT 'sourced',
      "profileText" TEXT,
      notes TEXT,
      "linkedinImported" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_candidates");

  // Chat (People AI) tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_chat_sessions");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_chat_messages (
      id TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL REFERENCES hr_chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_chat_messages");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_hr_chat_messages_session ON hr_chat_messages("sessionId")
  `);
  console.log("✓ index on hr_chat_messages.sessionId");

  // Agent hub tables
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_agent_sessions (
      id TEXT PRIMARY KEY,
      "agentId" TEXT NOT NULL,
      "agentName" TEXT NOT NULL,
      title TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_agent_sessions");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_agent_messages (
      id TEXT PRIMARY KEY,
      "sessionId" TEXT NOT NULL REFERENCES hr_agent_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_agent_messages");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_hr_agent_messages_session ON hr_agent_messages("sessionId")
  `);
  console.log("✓ index on hr_agent_messages.sessionId");

  // Upload log
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS hr_upload_logs (
      id TEXT PRIMARY KEY,
      filename TEXT,
      "totalRows" INTEGER NOT NULL DEFAULT 0,
      created INTEGER NOT NULL DEFAULT 0,
      failed INTEGER NOT NULL DEFAULT 0,
      errors JSONB NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ hr_upload_logs");

  console.log("\nAll HR tables verified and ready.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
