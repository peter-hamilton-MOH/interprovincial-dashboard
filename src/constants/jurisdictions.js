export const NEWS_JURISDICTIONS = [
  { code: 'All', name: 'All', fullName: 'All Jurisdictions' },
  { code: 'Fed', name: 'Federal', fullName: 'Federal (Government of Canada)' },
  { code: 'ON', name: 'Ontario', fullName: 'Ontario' },
  { code: 'QC', name: 'Quebec', fullName: 'Quebec' },
  { code: 'BC', name: 'British Columbia', fullName: 'British Columbia' },
  { code: 'AB', name: 'Alberta', fullName: 'Alberta' },
  { code: 'MB', name: 'Manitoba', fullName: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan', fullName: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia', fullName: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick', fullName: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador', fullName: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island', fullName: 'Prince Edward Island' },
  { code: 'YT', name: 'Yukon', fullName: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories', fullName: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut', fullName: 'Nunavut' },
];

export const FUNDING_JURISDICTIONS = [
  { code: 'All', name: 'All', fullName: 'All Jurisdictions' },
  { code: 'CAN', name: 'Canada', fullName: 'Canada (National Total)' },
  { code: 'ON', name: 'Ontario', fullName: 'Ontario' },
  { code: 'QC', name: 'Quebec', fullName: 'Quebec' },
  { code: 'BC', name: 'British Columbia', fullName: 'British Columbia' },
  { code: 'AB', name: 'Alberta', fullName: 'Alberta' },
  { code: 'MB', name: 'Manitoba', fullName: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan', fullName: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia', fullName: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick', fullName: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador', fullName: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island', fullName: 'Prince Edward Island' },
  { code: 'YT', name: 'Yukon', fullName: 'Yukon' },
  { code: 'NT', name: 'Northwest Territories', fullName: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut', fullName: 'Nunavut' },
];

export const JURISDICTION_CODE_MAP = Object.fromEntries(
  [...NEWS_JURISDICTIONS, ...FUNDING_JURISDICTIONS].map((j) => [j.name, j.code])
);

export const JURISDICTION_BADGE_COLORS = {
  Federal: 'bg-red-50 text-red-700 ring-red-600/20',
  Canada: 'bg-red-50 text-red-700 ring-red-600/20',
  Ontario: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Quebec: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  'British Columbia': 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Alberta: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Manitoba: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Saskatchewan: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  'Nova Scotia': 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  'New Brunswick': 'bg-violet-50 text-violet-700 ring-violet-600/20',
  'Newfoundland and Labrador': 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20',
  'Prince Edward Island': 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Yukon: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  'Northwest Territories': 'bg-slate-100 text-slate-700 ring-slate-600/20',
  Nunavut: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

export const TOPIC_BADGE_COLORS = {
  'Ministerial Announcement': 'bg-blue-50 text-blue-700 border-blue-200',
  'Federal Funding': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Public Health': 'bg-teal-50 text-teal-700 border-teal-200',
  'Capital and Infrastructure': 'bg-amber-50 text-amber-800 border-amber-200',
  'Mental Health and Addictions': 'bg-purple-50 text-purple-700 border-purple-200',
  'Primary Care': 'bg-sky-50 text-sky-700 border-sky-200',
  'Health Services and Access': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Health Workforce': 'bg-rose-50 text-rose-700 border-rose-200',
  'Digital Health': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  MAID: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  Pharmacare: 'bg-lime-50 text-lime-800 border-lime-200',
  'Interprovincial Billing': 'bg-orange-50 text-orange-700 border-orange-200',
  Other: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const SECTION_CONFIG = {
  'Government Announcements': {
    title: 'Government Announcements',
    subtitle: 'Official federal, provincial & territorial releases',
    accent: 'border-t-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    dotColor: 'bg-blue-600',
  },
  'Health Care Funding': {
    title: 'Health Care Funding',
    subtitle: 'Bilateral transfers, investments & capital grants',
    accent: 'border-t-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    dotColor: 'bg-emerald-600',
  },
  'Health Ministers News': {
    title: 'Health Ministers News',
    subtitle: 'Ministerial statements, briefings & FPT priorities',
    accent: 'border-t-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    dotColor: 'bg-indigo-600',
  },
  'Articles and Research Reports': {
    title: 'Articles and Research Reports',
    subtitle: 'CIHI publications, policy institutes & health media',
    accent: 'border-t-amber-500',
    badgeBg: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    dotColor: 'bg-amber-500',
  },
};

export const FUNDING_CATEGORY_META = [
  { key: 'hospitals', label: 'Hospitals', color: '#1d4ed8' },
  { key: 'other_institutions', label: 'Other Institutions', color: '#f97316' },
  { key: 'physicians', label: 'Physicians', color: '#0284c7' },
  { key: 'other_professionals', label: 'Other Professionals', color: '#0d9488' },
  { key: 'drugs', label: 'Drugs', color: '#7c3aed' },
  { key: 'public_health', label: 'Public Health', color: '#16a34a' },
  { key: 'administration', label: 'Administration', color: '#eab308' },
  { key: 'home_and_community_care', label: 'Home & Community Care', color: '#db2777' },
  { key: 'other_health_spending_net_hcc', label: 'Other Health Spending', color: '#64748b' },
  { key: 'covid_response_funding', label: 'COVID Response Funding', color: '#ef4444' },
];

export const AGE_SERVICE_CATEGORIES = [
  { value: 'total_health', label: 'Total Health' },
  { value: 'hospitals', label: 'Hospitals' },
  { value: 'physicians', label: 'Physicians' },
  { value: 'drugs', label: 'Drugs' },
  { value: 'other_institutions', label: 'Other Institutions' },
  { value: 'other_professionals', label: 'Other Professionals' },
];
