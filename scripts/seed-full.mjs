// Full seed: employees, onboarding, compliance, jobs, candidates
// Run: npx dotenv-cli -e .env.local -- node scripts/seed-full.mjs
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function cuid() { return randomUUID(); }
function daysFromNow(d) { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt; }
function daysAgo(d) { return daysFromNow(-d); }

// ── EMPLOYEES ──────────────────────────────────────────────────────
const EMPLOYEES = [
  // Founders / Exec
  { name: "Ahmed Helmy", email: "ahmed.helmy@think-ai.com", role: "CEO & Co-Founder", level: "L15", department: "Leadership", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(730), status: "active" },
  { name: "Sara Al-Otaibi", email: "sara.alotaibi@think-ai.com", role: "Chief People Officer", level: "L12", department: "People", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(540), status: "active" },
  { name: "Khalid Al-Zahrani", email: "khalid.alzahrani@think-ai.com", role: "CTO", level: "L13", department: "Engineering", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(620), status: "active" },

  // Engineering — Saudi nationals
  { name: "Noura Bint Faisal", email: "noura.faisal@think-ai.com", role: "Senior AI Engineer", level: "L7", department: "Engineering", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(420), status: "active" },
  { name: "Abdulaziz Al-Harbi", email: "abdulaziz.alharbi@think-ai.com", role: "ML Platform Lead", level: "L9", department: "Engineering", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(380), status: "active" },
  { name: "Rana Al-Shehri", email: "rana.alshehri@think-ai.com", role: "AI Research Scientist", level: "L8", department: "Engineering", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(290), status: "active" },

  // Engineering — Expats
  { name: "Priya Sharma", email: "priya.sharma@think-ai.com", role: "Principal ML Engineer", level: "L9", department: "Engineering", isExpat: true, nationality: "Indian", startDate: daysAgo(450), status: "active", iqamaExpiry: daysFromNow(210) },
  { name: "Wei Zhang", email: "wei.zhang@think-ai.com", role: "Embedded AI Engineer", level: "L7", department: "Engineering", isExpat: true, nationality: "Chinese", startDate: daysAgo(180), status: "active", iqamaExpiry: daysFromNow(185) },
  { name: "Dmitri Volkov", email: "dmitri.volkov@think-ai.com", role: "Hardware Design Lead", level: "L8", department: "Engineering", isExpat: true, nationality: "Russian", startDate: daysAgo(320), status: "active", iqamaExpiry: daysFromNow(25) }, // <30d — alert!

  // Product & Design
  { name: "Lama Al-Dosari", email: "lama.aldosari@think-ai.com", role: "Senior Product Manager", level: "L8", department: "Product", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(260), status: "active" },
  { name: "Marco Ricci", email: "marco.ricci@think-ai.com", role: "Principal Product Designer", level: "L8", department: "Design", isExpat: true, nationality: "Italian", startDate: daysAgo(210), status: "active", iqamaExpiry: daysFromNow(310) },

  // Probation
  { name: "Fatima Al-Amoudi", email: "fatima.alamoudi@think-ai.com", role: "AI Engineer", level: "L5", department: "Engineering", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(45), status: "probation" },
  { name: "James Okonkwo", email: "james.okonkwo@think-ai.com", role: "DevOps / MLOps Engineer", level: "L6", department: "Engineering", isExpat: true, nationality: "Nigerian", startDate: daysAgo(20), status: "probation", iqamaExpiry: daysFromNow(70) },

  // Finance & Operations
  { name: "Tariq Al-Mutairi", email: "tariq.almutairi@think-ai.com", role: "Head of Finance", level: "L10", department: "Finance", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(400), status: "active" },
  { name: "Hind Al-Rasheed", email: "hind.alrasheed@think-ai.com", role: "People Operations Manager", level: "L7", department: "People", isExpat: false, nationality: "Saudi Arabia", startDate: daysAgo(310), status: "active" },
];

const ONBOARDING_PHASES = [
  { phase: "preboarding", items: [
    { label: "Qiwa contract generated and e-signed", owner: "people", done: true },
    { label: "Documents collected (ID, certificates, photo, IBAN)", owner: "people", done: true },
    { label: "IT accounts provisioned and laptop prepared", owner: "it", done: true },
    { label: "Buddy assigned and 30/60/90 plan drafted by manager", owner: "manager", done: true },
    { label: "Welcome pack sent", owner: "people", done: true },
    { label: "GOSI and WPS cycle set up", owner: "people", done: true },
  ]},
  { phase: "week1", items: [
    { label: "Welcome, workspace setup and IT access confirmed", owner: "it", done: true },
    { label: "Compliance walkthrough: contract, probation, leave, CoC, IP", owner: "people", done: true },
    { label: "Values module: Ownership, Agility, Impact, Craft", owner: "manager", done: true },
    { label: "Manager 1:1 on role purpose and 30/60/90 goals", owner: "manager", done: true },
    { label: "Buddy and team introductions", owner: "employee", done: true },
    { label: "Security and data-handling basics completed", owner: "it", done: false },
  ]},
  { phase: "day30", items: [
    { label: "Productive on core tools and stack", owner: "employee", done: false },
    { label: "30/60/90 goals documented and aligned", owner: "manager", done: false },
    { label: "Required compliance training completed", owner: "employee", done: false },
    { label: "30-day check-in documented by manager", owner: "manager", done: false },
  ]},
  { phase: "day60", items: [
    { label: "Owns at least one deliverable end-to-end", owner: "employee", done: false },
    { label: "Mid-probation review documented", owner: "manager", done: false },
    { label: "Feedback shared and development goal set", owner: "manager", done: false },
  ]},
  { phase: "day90", items: [
    { label: "At role expectations — probation decision documented", owner: "manager", done: false },
    { label: "OKRs set for the current half", owner: "employee", done: false },
    { label: "GOSI and payroll confirmed correct", owner: "people", done: false },
  ]},
];

// ── JOBS ──────────────────────────────────────────────────────────
const JOBS = [
  { title: "Senior ML Engineer", department: "Engineering", level: "L7", minYearsExp: 4, maxYearsExp: 8, specialty: "NLP / LLM Fine-tuning", description: "Build and fine-tune large language models for Arabic-language and domain-specific AI products. Work at the intersection of research and production. Implement efficient training pipelines, evaluation frameworks, and deployment infrastructure.", requirements: ["PyTorch or JAX", "Transformers & PEFT", "Distributed training (FSDP/DeepSpeed)", "3+ years fine-tuning LLMs", "Arabic NLP experience is a strong plus"], headcount: 2 },
  { title: "Embedded AI / Firmware Engineer", department: "Engineering", level: "L6", minYearsExp: 3, maxYearsExp: 7, specialty: "Embedded / Edge AI", description: "Deploy AI models on edge hardware (custom silicon, NPUs, microcontrollers). Write optimized C/C++ inference code. Work with hardware teams on bringup, profiling, and production firmware for AI accelerators.", requirements: ["C/C++", "Embedded Linux or RTOS", "Model quantization & TFLite/ONNX", "ARM / RISC-V experience", "Hardware bring-up experience preferred"], headcount: 3 },
  { title: "AI Product Manager", department: "Product", level: "L8", minYearsExp: 5, maxYearsExp: 10, specialty: "AI Product Strategy", description: "Own the product roadmap for one of THINK-AI's AI product lines. Work directly with research and engineering to ship AI-native features. Define metrics, write crisp PRDs, and run agile delivery cycles.", requirements: ["5+ years PM experience", "Deep understanding of ML product tradeoffs", "SQL / data fluency", "Shipped AI products to production", "Arabic preferred"], headcount: 1 },
  { title: "Hardware Design Engineer", department: "Engineering", level: "L7", minYearsExp: 4, maxYearsExp: 9, specialty: "ASIC / Silicon Design", description: "Design custom AI accelerator hardware: RTL design, synthesis, simulation, timing closure. Work on next-generation neural processing units for deployment in the region.", requirements: ["VHDL or SystemVerilog", "Synopsys / Cadence EDA", "Digital logic design", "Chip tapeout experience preferred", "FPGA prototyping"], headcount: 2 },
  { title: "MLOps / Platform Engineer", department: "Engineering", level: "L6", minYearsExp: 3, maxYearsExp: 7, specialty: "MLOps", description: "Build and maintain the ML platform that trains, evaluates, and serves models at scale. Own CI/CD for model releases, feature stores, experiment tracking, and observability for production AI systems.", requirements: ["Kubernetes & Helm", "MLflow / Weights & Biases", "Terraform / Pulumi", "Python", "AWS or GCP"], headcount: 2 },
  { title: "Research Scientist — Vision AI", department: "Engineering", level: "L8", minYearsExp: 5, maxYearsExp: 12, specialty: "Computer Vision", description: "Drive applied research in computer vision for industrial and consumer AI products. Publish selectively, but ship always. Collaborate with hardware and software teams to bring models from paper to deployment.", requirements: ["PhD or equivalent research track", "PyTorch", "Published CV work (CVPR/ECCV/ICCV)", "Depth estimation or 3D vision preferred", "Diffusion models or generative AI"], headcount: 1 },
  { title: "Data Engineer — AI Infrastructure", department: "Data Science", level: "L6", minYearsExp: 3, maxYearsExp: 7, specialty: "Data Engineering", description: "Build the data infrastructure that feeds our AI models: ingestion, storage, processing pipelines, and feature engineering at scale. Work with Arabic-language data, web crawls, and proprietary datasets.", requirements: ["Apache Spark or Flink", "dbt & Airflow", "Parquet / Delta Lake", "SQL mastery", "Experience with large-scale crawl/NLP datasets"], headcount: 2 },
  { title: "Talent Acquisition Specialist", department: "People", level: "L5", minYearsExp: 2, maxYearsExp: 5, specialty: "Technical Recruiting", description: "Source and close world-class AI talent for THINK-AI. Run end-to-end recruitment for technical roles (ML, hardware, software). Partner with hiring managers on scorecards, pipelines, and offers.", requirements: ["2+ years technical recruiting", "Experience hiring ML/AI engineers", "KSA labour law basics", "Qiwa / Enjaz familiarity preferred", "Arabic and English fluency"], headcount: 1 },
];

// ── CANDIDATES ────────────────────────────────────────────────────
const CANDIDATES = [
  { name: "Omar Al-Ghamdi", currentRole: "Senior ML Engineer", currentCompany: "Saudi Aramco AI", country: "Saudi Arabia", city: "Dhahran", yearsExperience: 6, specialty: "NLP / LLMs", hasAICompanyExp: true, aiCompanies: ["Saudi Aramco AI"], skills: ["PyTorch", "Transformers", "Arabic NLP", "ONNX", "Kubernetes"], stage: "interview", matchScore: 0.91 },
  { name: "Nour Khalid Al-Khalid", currentRole: "Research Scientist", currentCompany: "KACST", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 8, specialty: "Computer Vision", hasAICompanyExp: true, aiCompanies: ["KACST", "SDAIA"], skills: ["PyTorch", "CVPR publications", "3D Vision", "Diffusion Models"], stage: "offer", matchScore: 0.95 },
  { name: "Rahul Menon", currentRole: "ML Platform Lead", currentCompany: "Careem", country: "UAE", city: "Dubai", yearsExperience: 7, specialty: "MLOps", hasAICompanyExp: true, aiCompanies: ["Careem", "Noon"], skills: ["Kubernetes", "MLflow", "Terraform", "Python", "AWS"], stage: "screening", matchScore: 0.82 },
  { name: "Layla Hassan", currentRole: "Embedded Systems Engineer", currentCompany: "Qualcomm", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 5, specialty: "Embedded AI", hasAICompanyExp: true, aiCompanies: ["Qualcomm"], skills: ["C/C++", "ARM", "TFLite", "Embedded Linux", "RTOS"], stage: "interview", matchScore: 0.88 },
  { name: "Arjun Nair", currentRole: "Senior Hardware Engineer", currentCompany: "Intel", country: "India", city: "Bengaluru", yearsExperience: 9, specialty: "ASIC / Silicon Design", hasAICompanyExp: true, aiCompanies: ["Intel"], skills: ["SystemVerilog", "Synopsys", "Timing Closure", "FPGA", "Chip Tapeout"], stage: "sourced", matchScore: 0.79 },
  { name: "Maysa Al-Subhi", currentRole: "Product Manager — AI", currentCompany: "stc", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 6, specialty: "AI Product Strategy", hasAICompanyExp: false, skills: ["Product Strategy", "SQL", "Agile", "Arabic NLP products", "B2B SaaS"], stage: "interview", matchScore: 0.84 },
  { name: "Chen Wei", currentRole: "Data Engineer", currentCompany: "Alibaba DAMO Academy", country: "China", city: "Hangzhou", yearsExperience: 5, specialty: "Data Engineering", hasAICompanyExp: true, aiCompanies: ["Alibaba DAMO Academy"], skills: ["Spark", "dbt", "Airflow", "Delta Lake", "Python"], stage: "sourced", matchScore: 0.76 },
  { name: "Mona Al-Rashidi", currentRole: "ML Engineer", currentCompany: "NEOM", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 4, specialty: "NLP / LLM Fine-tuning", hasAICompanyExp: true, aiCompanies: ["NEOM"], skills: ["PyTorch", "PEFT", "Arabic NLP", "DeepSpeed", "HuggingFace"], stage: "interview", matchScore: 0.90 },
  { name: "Viktor Petrov", currentRole: "Research Scientist", currentCompany: "Yandex", country: "Russia", city: "Moscow", yearsExperience: 10, specialty: "Computer Vision", hasAICompanyExp: true, aiCompanies: ["Yandex"], skills: ["PyTorch", "3D Vision", "SLAM", "Generative Models", "C++"], stage: "screening", matchScore: 0.72 },
  { name: "Saud Al-Dawsari", currentRole: "Data Scientist", currentCompany: "STC Digital", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 3, specialty: "MLOps", hasAICompanyExp: false, skills: ["Python", "MLflow", "AWS SageMaker", "Kubernetes basics", "SQL"], stage: "sourced", matchScore: 0.67 },
  { name: "Preethi Iyer", currentRole: "Firmware Engineer", currentCompany: "Arm", country: "UK", city: "Cambridge", yearsExperience: 6, specialty: "Embedded AI", hasAICompanyExp: true, aiCompanies: ["Arm"], skills: ["C/C++", "ARM Cortex-M", "TFLite Micro", "CMSIS-NN", "Embedded Linux"], stage: "offer", matchScore: 0.92 },
  { name: "Bader Al-Qahtani", currentRole: "Senior PM — AI Products", currentCompany: "Elm", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 7, specialty: "AI Product Strategy", hasAICompanyExp: true, aiCompanies: ["Elm", "SDAIA"], skills: ["Product Management", "Gov-tech AI", "Arabic fluency", "Data literacy", "Stakeholder management"], stage: "interview", matchScore: 0.87 },
  { name: "Yuki Tanaka", currentRole: "AI Hardware Architect", currentCompany: "NEC", country: "Japan", city: "Tokyo", yearsExperience: 11, specialty: "ASIC / Silicon Design", hasAICompanyExp: true, aiCompanies: ["NEC"], skills: ["RTL Design", "Synthesis", "Power analysis", "DFT", "RISC-V"], stage: "sourced", matchScore: 0.74 },
  { name: "Reem Al-Anazi", currentRole: "ML Engineer", currentCompany: "King Abdulaziz City for Science and Technology", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 4, specialty: "NLP / LLMs", hasAICompanyExp: true, aiCompanies: ["KACST"], skills: ["PyTorch", "Arabic NLP", "Speech models", "HuggingFace", "FastAPI"], stage: "screening", matchScore: 0.85 },
  { name: "Santiago López", currentRole: "Data Platform Engineer", currentCompany: "Meta", country: "Spain", city: "Madrid", yearsExperience: 8, specialty: "Data Engineering", hasAICompanyExp: true, aiCompanies: ["Meta"], skills: ["Spark", "Flink", "Presto", "Parquet", "Hive"], stage: "screening", matchScore: 0.80 },
  { name: "Dina Al-Turki", currentRole: "Technical Recruiter", currentCompany: "PwC Middle East", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 4, specialty: "Technical Recruiting", hasAICompanyExp: false, skills: ["Technical recruiting", "ATS", "Qiwa", "Enjaz", "LinkedIn Recruiter"], stage: "interview", matchScore: 0.89 },
  { name: "Aditya Kumar", currentRole: "Research Engineer", currentCompany: "NVIDIA", country: "India", city: "Bengaluru", yearsExperience: 6, specialty: "Computer Vision", hasAICompanyExp: true, aiCompanies: ["NVIDIA"], skills: ["CUDA", "TensorRT", "PyTorch", "Triton", "3D scene understanding"], stage: "sourced", matchScore: 0.83 },
  { name: "Maryam Al-Fehaid", currentRole: "Product Designer", currentCompany: "Jahez", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 5, specialty: "UX / AI Product Design", hasAICompanyExp: false, skills: ["Figma", "User research", "Design systems", "AI UX patterns", "Arabic RTL"], stage: "sourced", matchScore: 0.70 },
  { name: "Faris Al-Essa", currentRole: "Cloud Infrastructure Engineer", currentCompany: "Saudi Telecom Company", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 5, specialty: "MLOps", hasAICompanyExp: false, skills: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Python"], stage: "sourced", matchScore: 0.65 },
  { name: "Amani Al-Ghamdi", currentRole: "AI Research Scientist", currentCompany: "Saudi Data and AI Authority (SDAIA)", country: "Saudi Arabia", city: "Riyadh", yearsExperience: 7, specialty: "NLP / LLMs", hasAICompanyExp: true, aiCompanies: ["SDAIA", "National Center for AI"], skills: ["Arabic NLP", "BERT/GPT fine-tuning", "Data governance", "Research publications", "Python"], stage: "interview", matchScore: 0.93 },
];

async function seed() {
  console.log("=== THINK-AI Full Seed ===\n");

  // Clear existing data (preserving table structure)
  await prisma.hrComplianceItem.deleteMany();
  await prisma.hrOnboardingChecklist.deleteMany();
  await prisma.hrEmployee.deleteMany();
  await prisma.hrCandidate.deleteMany();
  await prisma.hrJob.deleteMany();
  console.log("✓ Cleared existing HR data\n");

  // 1. Seed jobs first (needed for candidate FK)
  const jobIds = [];
  for (const job of JOBS) {
    const created = await prisma.hrJob.create({ data: { ...job, status: "open" } });
    jobIds.push(created.id);
    console.log(`  ✓ Job: ${job.title} (${job.level})`);
  }
  console.log(`\n✓ ${JOBS.length} jobs seeded\n`);

  // 2. Seed employees with onboarding + compliance
  for (const emp of EMPLOYEES) {
    const { iqamaExpiry, ...rest } = emp;
    const employee = await prisma.hrEmployee.create({
      data: { ...rest, iqamaExpiry: iqamaExpiry ?? null, notes: null },
    });

    // Create onboarding checklists — active employees have pre/week1 done
    const isNew = emp.status === "probation";
    for (const phase of ONBOARDING_PHASES) {
      const items = phase.items.map((it) => ({
        label: it.label,
        owner: it.owner,
        done: isNew ? false : it.done,
      }));
      await prisma.hrOnboardingChecklist.create({
        data: { employeeId: employee.id, phase: phase.phase, items },
      });
    }

    // Compliance items
    const complianceRows = [
      { type: "probation_review", title: `${emp.name} — 30-day review`, dueDate: new Date(emp.startDate.getTime() + 30 * 86400000), status: emp.status === "active" ? "completed" : "pending" },
      { type: "probation_review", title: `${emp.name} — 60-day review`, dueDate: new Date(emp.startDate.getTime() + 60 * 86400000), status: emp.status === "active" ? "completed" : "pending" },
      { type: "probation_decision", title: `${emp.name} — Probation decision`, dueDate: new Date(emp.startDate.getTime() + 170 * 86400000), status: emp.status === "active" ? "completed" : "pending" },
    ];
    if (emp.isExpat && iqamaExpiry) {
      complianceRows.push({ type: "iqama_renewal", title: `${emp.name} — Iqama renewal`, dueDate: new Date(iqamaExpiry.getTime() - 3 * 86400000), status: "pending" });
    }
    await prisma.hrComplianceItem.createMany({ data: complianceRows.map((r) => ({ ...r, employeeId: employee.id })) });

    console.log(`  ✓ Employee: ${emp.name} (${emp.level} ${emp.status})`);
  }
  console.log(`\n✓ ${EMPLOYEES.length} employees seeded with onboarding & compliance\n`);

  // 3. Seed candidates — distribute across jobs
  const jobRoleMap = {
    "NLP / LLM Fine-tuning": jobIds[0],
    "NLP / LLMs": jobIds[0],
    "Embedded AI": jobIds[1],
    "AI Product Strategy": jobIds[2],
    "ASIC / Silicon Design": jobIds[3],
    "MLOps": jobIds[4],
    "Computer Vision": jobIds[5],
    "Data Engineering": jobIds[6],
    "Technical Recruiting": jobIds[7],
  };

  for (const cand of CANDIDATES) {
    const jobId = jobRoleMap[cand.specialty] || null;
    await prisma.hrCandidate.create({
      data: {
        jobId,
        name: cand.name,
        currentRole: cand.currentRole,
        currentCompany: cand.currentCompany,
        country: cand.country,
        city: cand.city,
        yearsExperience: cand.yearsExperience,
        specialty: cand.specialty,
        hasAICompanyExp: cand.hasAICompanyExp,
        aiCompanies: cand.aiCompanies || [],
        skills: cand.skills || [],
        stage: cand.stage,
        matchScore: cand.matchScore,
        linkedinImported: false,
        languages: ["English", "Arabic"].slice(0, cand.country === "Saudi Arabia" ? 2 : 1),
        culturalBackground: cand.country === "Saudi Arabia" ? "Arab/Middle Eastern" : null,
      },
    });
    console.log(`  ✓ Candidate: ${cand.name} (${cand.specialty} · ${cand.stage})`);
  }
  console.log(`\n✓ ${CANDIDATES.length} candidates seeded\n`);

  // Summary
  const [empCount, jobCount, candCount, compCount] = await Promise.all([
    prisma.hrEmployee.count(),
    prisma.hrJob.count(),
    prisma.hrCandidate.count(),
    prisma.hrComplianceItem.count(),
  ]);
  console.log("=== SEED COMPLETE ===");
  console.log(`  Employees:        ${empCount}`);
  console.log(`  Jobs:             ${jobCount}`);
  console.log(`  Candidates:       ${candCount}`);
  console.log(`  Compliance items: ${compCount}`);
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
