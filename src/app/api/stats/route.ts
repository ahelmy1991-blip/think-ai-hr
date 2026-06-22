import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalEmployees, probationEmployees, expatEmployees,
    overdueCompliance, atRiskCompliance, totalJobs, activeJobs,
    totalCandidates, recentCandidates,
  ] = await Promise.all([
    prisma.hrEmployee.count(),
    prisma.hrEmployee.count({ where: { status: "probation" } }),
    prisma.hrEmployee.count({ where: { isExpat: true } }),
    prisma.hrComplianceItem.count({ where: { dueDate: { lt: now }, status: { not: "done" } } }),
    prisma.hrComplianceItem.count({ where: { dueDate: { gte: now, lte: in7Days }, status: { not: "done" } } }),
    prisma.hrJob.count(),
    prisma.hrJob.count({ where: { status: "open" } }),
    prisma.hrCandidate.count(),
    prisma.hrCandidate.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  return NextResponse.json({
    totalEmployees, probationEmployees, expatEmployees,
    overdueCompliance, atRiskCompliance, totalJobs, activeJobs,
    totalCandidates, recentCandidates,
  });
}
