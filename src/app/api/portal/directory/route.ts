import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Primary source: all non-terminated employees from hr_employees + profiles
    const employees = await prisma.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      role: string;
      department: string;
      level: string;
      email: string;
      start_date: string | null;
      is_expat: boolean;
      status: string;
      // from profile
      first_name: string | null;
      last_name: string | null;
      people_group: string | null;
      functional_team: string | null;
      city_region: string | null;
      country: string | null;
      work_phone: string | null;
      grade: string | null;
      band: string | null;
      team_lead: string | null;
      job_family: string | null;
      division: string | null;
    }>>(
      `SELECT
         e.id, e.name, e.role, e.department, e.level, e.email,
         e."startDate"::text AS start_date, e."isExpat" AS is_expat, e.status,
         p.first_name, p.last_name, p.people_group, p.functional_team,
         p.city_region, p.country, p.work_phone, p.grade, p.band,
         p.team_lead, p.job_family, p.division
       FROM hr_employees e
       LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
       WHERE e.status != 'terminated'
       ORDER BY e."startDate" ASC NULLS LAST, e.name ASC`
    );

    // Secondary source: manually curated hr_directory entries (for bios, linkedin, avatars, overrides)
    const dirEntries = await prisma.$queryRawUnsafe<Array<{
      id: string; name: string; title: string; department: string;
      team: string | null; location: string; avatar_url: string | null;
      linkedin_url: string | null; bio: string | null; email: string | null;
      start_year: number | null; sort_order: number; is_active: boolean;
    }>>(
      `SELECT id, name, title, department, team, location,
              avatar_url, linkedin_url, bio, email, start_year, sort_order, is_active
       FROM hr_directory WHERE is_active = true ORDER BY sort_order ASC, name ASC`
    );

    // Build a lookup of directory entries by email for bio/avatar/linkedin enrichment
    const dirByEmail: Record<string, typeof dirEntries[0]> = {};
    for (const d of dirEntries) {
      if (d.email) dirByEmail[d.email.toLowerCase()] = d;
    }

    // Map employees to the Person shape, enriched with directory data where available
    const people: Array<{
      id: string; name: string; title: string; department: string; team: string | null;
      location: string; avatar_url: string | null; linkedin_url: string | null;
      bio: string | null; email: string | null; start_year: number | null;
      level: string; grade: string | null; band: string | null;
      people_group: string | null; team_lead: string | null;
      is_expat: boolean; status: string;
    }> = employees.map(e => {
      const dir = dirByEmail[e.email.toLowerCase()];
      const startYear = e.start_date ? new Date(e.start_date).getFullYear() : null;
      const city = e.city_region || "Riyadh";
      const country = e.country || "KSA";
      const location = `${city}, ${country}`;

      // Derive a "team" label from people_group or functional_team
      const teamLabel = e.functional_team || e.people_group || null;

      return {
        id: e.id,
        name: e.name,
        title: e.role,
        department: e.department,
        team: teamLabel,
        location: dir?.location ?? location,
        avatar_url: dir?.avatar_url ?? null,
        linkedin_url: dir?.linkedin_url ?? null,
        bio: dir?.bio ?? null,
        email: e.email,
        start_year: startYear,
        // Extra fields for richer display
        level: e.level,
        grade: e.grade,
        band: e.band,
        people_group: e.people_group,
        team_lead: e.team_lead,
        is_expat: e.is_expat,
        status: e.status,
      };
    });

    // Also include any directory entries that have no matching employee (legacy/placeholder entries)
    const employeeEmails = new Set(employees.map(e => e.email.toLowerCase()));
    for (const d of dirEntries) {
      if (!d.email || !employeeEmails.has(d.email.toLowerCase())) {
        people.push({
          id: d.id,
          name: d.name,
          title: d.title,
          department: d.department,
          team: d.team,
          location: d.location,
          avatar_url: d.avatar_url,
          linkedin_url: d.linkedin_url,
          bio: d.bio,
          email: d.email ?? null,
          start_year: d.start_year,
          level: "",
          grade: null,
          band: null,
          people_group: null,
          team_lead: null,
          is_expat: false,
          status: "active",
        });
      }
    }

    return NextResponse.json(people);
  } catch (e) {
    console.error(e);
    return NextResponse.json([]);
  }
}
