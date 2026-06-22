export interface AgentMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  suggestions: string[];
}

export const AGENTS: AgentMeta[] = [
  {
    id: "people-ai",
    name: "People AI",
    tagline: "Policy & Framework Q&A",
    description:
      "Your single source of truth for the THINK-AI People Handbook. Ask about values, grading, ESOP, Saudi labour law, EOSB, leave, Iqama, onboarding, and everything in between.",
    icon: "🤝",
    color: "#0f2140",
    bgColor: "#e8f0fe",
    suggestions: [
      "What are the four THINK-AI values?",
      "How does EOSB calculate for someone who resigns after 3 years?",
      "What is the equity grant for an L7 Lead I?",
      "Explain the Thinker, Doer, Talker rating system",
      "What is our pay philosophy and target percentile?",
      "Walk me through the 30/60/90 onboarding structure",
    ],
  },
  {
    id: "talent-scout",
    name: "Talent Scout",
    tagline: "Recruitment Strategy & Hiring",
    description:
      "Strategic recruitment partner for AI talent in KSA. Write JDs, design sourcing campaigns, score candidates, navigate Nitaqat, and structure hiring scorecards around the THINK-AI values.",
    icon: "🎯",
    color: "#163058",
    bgColor: "#dbeafe",
    suggestions: [
      "Write a job description for an L7 Senior AI Engineer NLP",
      "What sourcing strategies work for Saudi national AI talent?",
      "How does Nitaqat affect our hiring quotas?",
      "What should a hiring scorecard for an L5 role include?",
      "How do we handle in-country Qiwa transfer vs. new visa?",
      "What is the typical cost to hire and onboard an expat engineer?",
    ],
  },
  {
    id: "comp-advisor",
    name: "Comp Advisor",
    tagline: "Packages, EOSB & Equity",
    description:
      "Precise compensation and rewards specialist. Design offer packages, calculate EOSB to the riyal, size ESOP grants per level, explain GOSI splits, and apply the P66 philosophy.",
    icon: "💰",
    color: "#92400e",
    bgColor: "#fef3c7",
    suggestions: [
      "Design an offer package for an L8 Lead II in Riyadh",
      "Calculate EOSB for an expat on SAR 28,000 who resigns after 4.5 years",
      "What equity grant should an L6 Senior Specialist receive?",
      "What is the GOSI split for a Saudi national vs. expat?",
      "How does the KSA salary structure split basic vs. allowances?",
      "What are the Nitaqat salary floors for engineers?",
    ],
  },
  {
    id: "onboarding-coach",
    name: "Onboarding Coach",
    tagline: "New Hire & Manager Support",
    description:
      "Warm and practical new-hire support. Build 30/60/90 day plans, guide managers through preboarding checklists, support expat Iqama onboarding, and embed THINK-AI values from Day 1.",
    icon: "🚀",
    color: "#166534",
    bgColor: "#dcfce7",
    suggestions: [
      "Build a 30/60/90 day plan for an L6 AI Engineer joining next week",
      "What does the preboarding checklist cover for an expat hire?",
      "When must the Iqama be issued after an expat arrives in KSA?",
      "What should the Week 1 values module cover?",
      "What triggers the probation decision at day 90?",
      "How should a manager structure the first 1:1 with a new team member?",
    ],
  },
  {
    id: "performance-guide",
    name: "Performance Guide",
    tagline: "OKRs, Reviews & Growth",
    description:
      "Structured performance management specialist. Write sharp OKRs, calibrate Thinker/Doer/Talker ratings, prepare managers for review conversations, design fair PIPs, and build promotion cases.",
    icon: "📈",
    color: "#5b21b6",
    bgColor: "#ede9fe",
    suggestions: [
      "Write 3 OKRs for an L7 Lead AI Engineer in Q3",
      "How do I calibrate between Thinker and Doer ratings?",
      "What is the correct PIP chain before a performance separation?",
      "How does the annual performance cycle connect to comp and equity?",
      "What makes a promotion case from L6 to L7 strong?",
      "How should I structure a difficult performance conversation?",
    ],
  },
];
