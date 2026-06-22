import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockObjectRequest = any;
import { prisma } from "@/lib/db";
import { POLICY_SECTIONS } from "@/lib/policy";
import { ONBOARDING_PHASES } from "@/lib/onboarding-items";

export const dynamic = 'force-dynamic';

function getNotionClient() {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN not set");
  return new Client({ auth: token });
}

export async function POST(req: NextRequest) {
  try {
    const { type, id, parentPageId } = await req.json();
    const notion = getNotionClient();
    const parent = parentPageId || process.env.NOTION_PARENT_PAGE_ID;
    if (!parent) return NextResponse.json({ error: "parentPageId or NOTION_PARENT_PAGE_ID required" }, { status: 400 });

    if (type === "policy_index") {
      const page = await notion.pages.create({
        parent: { page_id: parent },
        properties: { title: { title: [{ text: { content: "THINK-AI People Policy Handbook" } }] } },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              rich_text: [{ type: "text", text: { content: "V1.0 - Effective 1 July 2026 - Owner: People Team - Riyadh, KSA" } }],
              icon: { type: "emoji", emoji: "📋" },
              color: "blue_background",
            },
          } as BlockObjectRequest,
          ...POLICY_SECTIONS.map((s) => ({
            object: "block" as const,
            type: "bulleted_list_item" as const,
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: `${s.id}: ${s.title}` } }],
            },
          })),
        ],
      });
      return NextResponse.json({ url: (page as { url: string }).url, pageId: page.id });
    }

    if (type === "onboarding_checklist" && id) {
      const employee = await prisma.hrEmployee.findUnique({
        where: { id },
        include: { checklists: true },
      });
      if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

      const blocks: BlockObjectRequest[] = [
        {
          object: "block",
          type: "callout",
          callout: {
            rich_text: [{ type: "text", text: { content: `Employee: ${employee.name} - Start: ${employee.startDate.toLocaleDateString()} - ${employee.isExpat ? "Expatriate" : "Saudi National"}` } }],
            icon: { type: "emoji", emoji: "👋" },
            color: "green_background",
          },
        } as BlockObjectRequest,
      ];

      for (const checklist of employee.checklists) {
        const phase = ONBOARDING_PHASES[checklist.phase];
        if (!phase) continue;
        blocks.push({
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ type: "text", text: { content: `${phase.label} (${phase.days})` } }] },
        } as BlockObjectRequest);
        const items = checklist.items as Array<{ label: string; done: boolean }>;
        for (const item of items) {
          blocks.push({
            object: "block",
            type: "to_do",
            to_do: { rich_text: [{ type: "text", text: { content: item.label } }], checked: item.done },
          } as BlockObjectRequest);
        }
      }

      const page = await notion.pages.create({
        parent: { page_id: parent },
        properties: { title: { title: [{ text: { content: `Onboarding: ${employee.name}` } }] } },
        children: blocks,
      });
      return NextResponse.json({ url: (page as { url: string }).url, pageId: page.id });
    }

    if (type === "compliance_report") {
      const items = await prisma.hrComplianceItem.findMany({
        where: { status: { not: "done" } },
        orderBy: { dueDate: "asc" },
        include: { employee: { select: { name: true } } },
      });

      const blocks: BlockObjectRequest[] = [
        {
          object: "block",
          type: "callout",
          callout: {
            rich_text: [{ type: "text", text: { content: `Generated: ${new Date().toLocaleDateString()} - ${items.length} open items` } }],
            icon: { type: "emoji", emoji: "⚠️" },
            color: "red_background",
          },
        } as BlockObjectRequest,
      ];

      for (const item of items) {
        const daysLeft = Math.ceil((item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const status = daysLeft < 0 ? "OVERDUE" : daysLeft <= 7 ? "AT RISK" : "PENDING";
        blocks.push({
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: [{ type: "text", text: { content: `[${status}] ${item.title}${item.employee ? ` - ${item.employee.name}` : ""} - Due: ${item.dueDate.toLocaleDateString()}` } }],
            checked: false,
          },
        } as BlockObjectRequest);
      }

      const page = await notion.pages.create({
        parent: { page_id: parent },
        properties: { title: { title: [{ text: { content: `HR Compliance Report - ${new Date().toLocaleDateString()}` } }] } },
        children: blocks,
      });
      return NextResponse.json({ url: (page as { url: string }).url, pageId: page.id });
    }

    return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
  } catch (e) {
    const err = e as Error;
    console.error(e);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
