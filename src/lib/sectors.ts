/**
 * Fixed sector lists. Pages pick up to MAX_SECTORS from these lists instead of typing free text,
 * so filters and sector pages stay clean (no "AI" / "Artificial intelligence" / "Yapay zeka" duplicates).
 * Free keywords belong in tags.
 */
export const MAX_SECTORS = 3;

/** Industries for people, companies and institutions, grouped for the picker. */
export const SECTOR_GROUPS: { group: string; sectors: string[] }[] = [
  {
    group: "Technology",
    sectors: [
      "Software & SaaS", "Artificial Intelligence", "Cybersecurity", "Cloud & Infrastructure", "Data & Analytics", "Developer Tools",
      "Hardware & Electronics", "Semiconductors", "Internet & Platforms", "Mobile Apps", "Robotics & Automation", "Internet of Things",
      "Blockchain & Web3", "AR / VR", "Quantum Computing", "IT Services & Outsourcing", "Telecommunications",
    ],
  },
  {
    group: "Finance",
    sectors: [
      "Banking", "Fintech", "Payments", "Insurance", "Insurtech", "Asset & Wealth Management", "Venture Capital", "Private Equity",
      "Investment Banking", "Accounting & Audit", "Crypto & Digital Assets", "Real Estate Investment",
    ],
  },
  {
    group: "Commerce & Consumer",
    sectors: [
      "E-commerce", "Retail", "Consumer Goods", "Fashion & Apparel", "Luxury Goods", "Beauty & Cosmetics", "Food & Beverage",
      "Restaurants & Hospitality", "Food Delivery", "Sports & Fitness", "Home & Furniture", "Pets", "Marketplaces",
    ],
  },
  {
    group: "Marketing & Media",
    sectors: [
      "Marketing & Advertising", "Digital Marketing", "Public Relations", "Media & Publishing", "News & Journalism", "Film & Television",
      "Music & Audio", "Gaming & Esports", "Social Media & Creators", "Events & Conferences", "Design & Creative",
    ],
  },
  {
    group: "Health & Science",
    sectors: [
      "Healthcare", "Healthtech", "Hospitals & Clinics", "Pharmaceuticals", "Biotechnology", "Medical Devices", "Mental Health",
      "Wellness", "Life Sciences Research", "Veterinary",
    ],
  },
  {
    group: "Industry & Energy",
    sectors: [
      "Manufacturing", "Industrial Machinery", "Automotive", "Electric Vehicles & Mobility", "Aerospace & Defense", "Chemicals",
      "Steel & Metals", "Mining", "Oil & Gas", "Renewable Energy", "Energy & Utilities", "Climate Tech", "Water & Waste Management",
      "Construction", "Architecture & Engineering", "Textiles", "Packaging",
    ],
  },
  {
    group: "Transport & Logistics",
    sectors: ["Logistics & Supply Chain", "Shipping & Maritime", "Aviation & Airlines", "Railways", "Transportation", "Warehousing", "Mobility Services"],
  },
  {
    group: "Property & Places",
    sectors: ["Real Estate", "Proptech", "Facilities Management", "Travel & Tourism", "Hotels & Accommodation", "Smart Cities"],
  },
  {
    group: "Professional Services",
    sectors: [
      "Management Consulting", "Legal Services", "Legaltech", "Human Resources & Recruiting", "HR Tech", "Business Services",
      "Translation & Localization", "Research & Market Intelligence", "Outsourcing & BPO",
    ],
  },
  {
    group: "Education & Research",
    sectors: ["Education", "Edtech", "Higher Education", "Training & Coaching", "Research & Development"],
  },
  {
    group: "Agriculture & Food Production",
    sectors: ["Agriculture", "Agritech", "Food Production", "Fisheries & Aquaculture", "Forestry"],
  },
  {
    group: "Public & Social",
    sectors: ["Government & Public Sector", "Non-profit & NGOs", "Social Impact", "International Organizations", "Religious Organizations", "Politics"],
  },
  {
    group: "Entrepreneurship",
    sectors: ["Startups & Entrepreneurship", "Incubators & Accelerators", "Family Business", "Holding Companies", "Franchising"],
  },
];

/** Categories for SaaS projects. */
export const SAAS_CATEGORY_GROUPS: { group: string; sectors: string[] }[] = [
  {
    group: "Business",
    sectors: [
      "CRM", "Sales", "Marketing Automation", "Email Marketing", "SEO & Content", "Social Media Management", "Customer Support",
      "Project Management", "Productivity", "Collaboration", "Communication", "Forms & Surveys", "Scheduling & Booking",
      "Document Management", "E-signature", "Knowledge Base",
    ],
  },
  {
    group: "Finance & Operations",
    sectors: ["Accounting", "Invoicing & Billing", "Payments", "Expense Management", "ERP", "Inventory", "Procurement", "Legal & Compliance"],
  },
  {
    group: "People",
    sectors: ["HR & Payroll", "Recruiting", "Employee Engagement", "Learning Management"],
  },
  {
    group: "Data & AI",
    sectors: ["Analytics", "Business Intelligence", "AI Assistants", "AI Content Generation", "Machine Learning Platform", "Data Integration"],
  },
  {
    group: "Developers & IT",
    sectors: ["Developer Tools", "API Platform", "Hosting & Infrastructure", "Monitoring & Observability", "Security", "Identity & Access", "No-code / Low-code", "Website Builder"],
  },
  {
    group: "Industry",
    sectors: [
      "E-commerce Platform", "Restaurant & Hospitality", "Real Estate", "Healthcare", "Education", "Logistics", "Construction",
      "Automotive", "Agriculture", "Nonprofit", "Government",
    ],
  },
  {
    group: "Creative",
    sectors: ["Design", "Video & Audio", "Photography", "Presentations"],
  },
];

export const SECTORS = SECTOR_GROUPS.flatMap((g) => g.sectors);
export const SAAS_CATEGORIES = SAAS_CATEGORY_GROUPS.flatMap((g) => g.sectors);

const key = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Common free-text spellings mapped to the list (used when old pages are converted). */
const SYNONYMS: Record<string, string> = {
  ai: "Artificial Intelligence",
  "ai platforms": "Artificial Intelligence",
  "machine learning": "Artificial Intelligence",
  "yapay zeka": "Artificial Intelligence",
  software: "Software & SaaS",
  saas: "Software & SaaS",
  technology: "Software & SaaS",
  tech: "Software & SaaS",
  "information technology": "IT Services & Outsourcing",
  it: "IT Services & Outsourcing",
  security: "Cybersecurity",
  "cyber security": "Cybersecurity",
  finance: "Banking",
  "financial services": "Banking",
  bank: "Banking",
  marketing: "Marketing & Advertising",
  advertising: "Marketing & Advertising",
  entrepreneurship: "Startups & Entrepreneurship",
  startups: "Startups & Entrepreneurship",
  startup: "Startups & Entrepreneurship",
  consulting: "Management Consulting",
  legal: "Legal Services",
  law: "Legal Services",
  health: "Healthcare",
  pharma: "Pharmaceuticals",
  biotech: "Biotechnology",
  energy: "Energy & Utilities",
  renewables: "Renewable Energy",
  logistics: "Logistics & Supply Chain",
  "supply chain": "Logistics & Supply Chain",
  tourism: "Travel & Tourism",
  travel: "Travel & Tourism",
  gaming: "Gaming & Esports",
  games: "Gaming & Esports",
  media: "Media & Publishing",
  publishing: "Media & Publishing",
  "real estate": "Real Estate",
  "food": "Food & Beverage",
  "food and beverage": "Food & Beverage",
  hospitality: "Restaurants & Hospitality",
  restaurants: "Restaurants & Hospitality",
  "qr menu platform": "Restaurants & Hospitality",
  ecommerce: "E-commerce",
  "e commerce": "E-commerce",
  robotics: "Robotics & Automation",
  automation: "Robotics & Automation",
  defense: "Aerospace & Defense",
  defence: "Aerospace & Defense",
  aerospace: "Aerospace & Defense",
  nonprofit: "Non-profit & NGOs",
  "non profit": "Non-profit & NGOs",
  ngo: "Non-profit & NGOs",
  government: "Government & Public Sector",
  hr: "Human Resources & Recruiting",
  recruiting: "Human Resources & Recruiting",
  "venture capital": "Venture Capital",
  vc: "Venture Capital",
  crypto: "Crypto & Digital Assets",
  blockchain: "Blockchain & Web3",
  web3: "Blockchain & Web3",
  telecom: "Telecommunications",
  automotive: "Automotive",
  education: "Education",
  edtech: "Edtech",
  university: "Higher Education",
};

const SAAS_SYNONYMS: Record<string, string> = {
  ai: "AI Assistants",
  "ai platforms": "AI Assistants",
  marketing: "Marketing Automation",
  "qr menu platform": "Restaurant & Hospitality",
  restaurants: "Restaurant & Hospitality",
  hospitality: "Restaurant & Hospitality",
  "data analytics": "Analytics",
  bi: "Business Intelligence",
  hr: "HR & Payroll",
  payroll: "HR & Payroll",
  billing: "Invoicing & Billing",
  invoicing: "Invoicing & Billing",
  security: "Security",
  devtools: "Developer Tools",
  "website builder": "Website Builder",
  ecommerce: "E-commerce Platform",
  "e commerce": "E-commerce Platform",
  forms: "Forms & Surveys",
  surveys: "Forms & Surveys",
  booking: "Scheduling & Booking",
  scheduling: "Scheduling & Booking",
  support: "Customer Support",
  helpdesk: "Customer Support",
};

/** The list a page picks from: SaaS projects use SaaS categories, everything else industries. */
export const listFor = (saas: boolean) => (saas ? SAAS_CATEGORIES : SECTORS);
export const groupsFor = (saas: boolean) => (saas ? SAAS_CATEGORY_GROUPS : SECTOR_GROUPS);

/** Keeps only valid choices from the right list, without duplicates, at most MAX_SECTORS. */
export function cleanSectors(values: unknown[], saas: boolean): string[] {
  const allowed = new Map(listFor(saas).map((s) => [key(s), s]));
  const out: string[] = [];
  for (const v of values) {
    const s = allowed.get(key(String(v ?? "")));
    if (s && !out.includes(s)) out.push(s);
    if (out.length === MAX_SECTORS) break;
  }
  return out;
}

/** Converts old free text ("AI Platforms, Banking, Marketing") to list entries; unknown parts are dropped. */
export function sectorsFromText(text: string, saas: boolean): string[] {
  const allowed = new Map(listFor(saas).map((s) => [key(s), s]));
  const synonyms = saas ? { ...SAAS_SYNONYMS } : SYNONYMS;
  const parts = text.split(/,|;|\/|\||&(?=\s*[A-Z])|\band\b/i).map((p) => key(p)).filter(Boolean);
  const whole = key(text);
  const found: string[] = [];
  for (const k of [whole, ...parts]) {
    const s = allowed.get(k) ?? synonyms[k];
    if (s && !found.includes(s)) found.push(s);
  }
  return found.slice(0, MAX_SECTORS);
}
