#!/usr/bin/env node
/**
 * Seed a fully populated DEMO company + owner login.
 * -------------------------------------------------
 * Creates (or refreshes) one Firebase Auth user and a complete Firestore
 * tenant under `companies/{DEMO_COMPANY_ID}` so the product can be shown to a
 * real person without touching any live tenant: employees, permission groups,
 * pipeline stages, listings (+ units, auction, private data), leads (+ notes
 * and activity timeline), tasks, KPI snapshots, notifications and the
 * `global_listings` marketplace mirror.
 *
 * Usage:
 *   node scripts/seed-demo-account.mjs
 *   node scripts/seed-demo-account.mjs --email dummy@gmail.com --password "Aa1122334455@"
 *   node scripts/seed-demo-account.mjs --keep      # do not wipe before seeding
 *   node scripts/seed-demo-account.mjs --publish   # publish listings publicly
 *
 * By default every listing is seeded as a DRAFT and nothing is written to
 * `global_listings`, so the demo inventory never reaches the public
 * marketplace or the demo storefront. Pass `--publish` to seed the listings
 * with their intended public statuses (and the marketplace mirror) instead.
 *
 * Re-running wipes ONLY `companies/demo-company` (and its marketplace mirror
 * docs) and rebuilds it. No other tenant is read or written.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// env
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const rawLine of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

function parseArgs(argv) {
  const args = {
    email: "dummy@gmail.com",
    password: "Aa1122334455@",
    slug: "demo",
    companyId: "demo-company",
    keep: false,
    publish: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--keep") args.keep = true;
    else if (token === "--publish") args.publish = true;
    else if (token === "--email") args.email = (argv[++i] || "").trim();
    else if (token === "--password") args.password = argv[++i] || "";
    else if (token === "--slug") args.slug = (argv[++i] || "").trim();
    else if (token === "--company-id") args.companyId = (argv[++i] || "").trim();
  }
  return args;
}

const args = parseArgs(process.argv);
const COMPANY_ID = args.companyId;
const SLUG = args.slug;

const PROJECT_ID = (
  process.env.ADMIN_PROJECT_ID ||
  process.env.FIREBASE_ADMIN_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  ""
).trim();
const CLIENT_EMAIL = (
  process.env.ADMIN_CLIENT_EMAIL ||
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
  ""
).trim();
const PRIVATE_KEY = (
  process.env.ADMIN_PRIVATE_KEY ||
  process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
  ""
)
  .replace(/\\n/g, "\n")
  .trim();

if (!PROJECT_ID) {
  console.error("Missing ADMIN_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
  process.exit(1);
}

initializeApp({
  credential:
    CLIENT_EMAIL && PRIVATE_KEY
      ? cert({
          projectId: PROJECT_ID,
          clientEmail: CLIENT_EMAIL,
          privateKey: PRIVATE_KEY,
        })
      : applicationDefault(),
  projectId: PROJECT_ID,
});

const auth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// constants mirrored from src/constants (this script is plain JS — no TS imports)
// ---------------------------------------------------------------------------
const OWNER_PERMISSIONS = [
  "create_listing",
  "edit_listing",
  "delete_listing",
  "publish_listing",
  "assign_listing",
  "feature_listing",
  "manage_bids",
  "view_owner_info",
  "create_employee",
  "edit_employee",
  "remove_employee",
  "view_employees",
  "manage_permission_groups",
  "create_task",
  "assign_tasks",
  "escalate_tasks",
  "complete_tasks",
  "manage_leads",
  "assign_leads",
  "view_matched_leads",
  "manage_pipeline",
  "view_kpi",
  "export_reports",
  "company_settings_access",
  "billing_access",
  "manage_branding",
];

const ROLE_PERMISSIONS = {
  company_owner: OWNER_PERMISSIONS,
  manager: [
    "create_listing",
    "edit_listing",
    "publish_listing",
    "assign_listing",
    "feature_listing",
    "manage_bids",
    "view_employees",
    "create_task",
    "assign_tasks",
    "escalate_tasks",
    "complete_tasks",
    "manage_leads",
    "assign_leads",
    "view_matched_leads",
    "manage_pipeline",
    "view_kpi",
    "export_reports",
  ],
  sales: [
    "create_listing",
    "edit_own_listing",
    "manage_bids",
    "manage_leads",
    "view_own_leads",
    "view_matched_leads",
    "complete_tasks",
    "view_own_kpi",
  ],
  marketing: [
    "manage_leads",
    "view_own_leads",
    "view_matched_leads",
    "complete_tasks",
    "view_own_kpi",
    "feature_listing",
  ],
  data_entry: [
    "create_listing",
    "edit_own_listing",
    "complete_tasks",
    "view_own_kpi",
  ],
};

const PIPELINE_STAGES = [
  { key: "new", labelEn: "New", labelAr: "جديد", color: "#3b82f6", order: 0, isTerminal: false, wonStage: false, legacyStatus: "new" },
  { key: "contacted", labelEn: "Contacted", labelAr: "تم التواصل", color: "#8b5cf6", order: 1, isTerminal: false, wonStage: false, legacyStatus: "contacted" },
  { key: "qualified", labelEn: "Qualified", labelAr: "مؤهل", color: "#f59e0b", order: 2, isTerminal: false, wonStage: false, legacyStatus: "qualified" },
  { key: "deal", labelEn: "Deal Won", labelAr: "صفقة", color: "#10b981", order: 3, isTerminal: true, wonStage: true, legacyStatus: "deal" },
  { key: "lost", labelEn: "Lost", labelAr: "مفقود", color: "#6b7280", order: 4, isTerminal: true, wonStage: false, legacyStatus: "lost" },
];

const BOARD_ORDER_STEP = 1024;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const ts = (msAgo) => Timestamp.fromMillis(NOW - Math.round(msAgo));
const daysAgo = (d) => ts(d * DAY);
const daysAhead = (d) => Timestamp.fromMillis(NOW + Math.round(d * DAY));
const img = (id, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

function media(ids) {
  return ids.map((id, i) => ({
    url: img(id),
    path: `demo/${id}.jpg`,
    type: "image",
    order: i,
    isCover: i === 0,
    width: 1400,
    height: 933,
  }));
}

function analytics(views, inquiries) {
  return {
    views,
    uniqueViews: Math.round(views * 0.72),
    inquiries,
    whatsappClicks: Math.round(inquiries * 1.8),
    phoneClicks: Math.round(inquiries * 1.2),
    favorites: Math.round(views * 0.06),
    lastViewedAt: daysAgo(1),
  };
}

function emptyKpi() {
  return {
    listingsCreated: 0,
    listingsActive: 0,
    callsMade: 0,
    leadsAssigned: 0,
    leadsConverted: 0,
    dealsClosed: 0,
    avgResponseMinutes: 0,
    tasksCompleted: 0,
    tasksOverdue: 0,
  };
}

/** Batched writer — Firestore caps a batch at 500 ops. */
function createWriter() {
  let batch = db.batch();
  let ops = 0;
  let total = 0;
  return {
    async set(ref, data) {
      batch.set(ref, data);
      ops += 1;
      total += 1;
      if (ops >= 400) await this.flush();
    },
    async flush() {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    },
    get total() {
      return total;
    },
  };
}

// ---------------------------------------------------------------------------
// people
// ---------------------------------------------------------------------------
const EMPLOYEES = [
  {
    id: "demo-emp-manager",
    name: "سارة القحطاني",
    email: "sara.demo@example.com",
    phone: "+966500000102",
    role: "manager",
    title: "مدير المبيعات",
    department: "المبيعات",
    kpi: { listingsCreated: 14, listingsActive: 9, callsMade: 186, leadsAssigned: 62, leadsConverted: 21, dealsClosed: 9, avgResponseMinutes: 12, tasksCompleted: 48, tasksOverdue: 2 },
  },
  {
    id: "demo-emp-sales-1",
    name: "خالد الشمري",
    email: "khalid.demo@example.com",
    phone: "+966500000103",
    role: "sales",
    title: "مستشار عقاري",
    department: "المبيعات",
    kpi: { listingsCreated: 11, listingsActive: 7, callsMade: 240, leadsAssigned: 74, leadsConverted: 18, dealsClosed: 7, avgResponseMinutes: 9, tasksCompleted: 55, tasksOverdue: 4 },
  },
  {
    id: "demo-emp-sales-2",
    name: "نورة الدوسري",
    email: "noura.demo@example.com",
    phone: "+966500000104",
    role: "sales",
    title: "مستشار عقاري",
    department: "المبيعات",
    kpi: { listingsCreated: 8, listingsActive: 6, callsMade: 197, leadsAssigned: 58, leadsConverted: 15, dealsClosed: 6, avgResponseMinutes: 15, tasksCompleted: 41, tasksOverdue: 1 },
  },
  {
    id: "demo-emp-marketing",
    name: "فيصل الحربي",
    email: "faisal.demo@example.com",
    phone: "+966500000105",
    role: "marketing",
    title: "أخصائي تسويق",
    department: "التسويق",
    kpi: { listingsCreated: 3, listingsActive: 2, callsMade: 64, leadsAssigned: 33, leadsConverted: 8, dealsClosed: 2, avgResponseMinutes: 22, tasksCompleted: 29, tasksOverdue: 3 },
  },
  {
    id: "demo-emp-data",
    name: "ريم العنزي",
    email: "reem.demo@example.com",
    phone: "+966500000106",
    role: "data_entry",
    title: "إدخال بيانات",
    department: "العمليات",
    kpi: { listingsCreated: 22, listingsActive: 16, callsMade: 12, leadsAssigned: 6, leadsConverted: 1, dealsClosed: 0, avgResponseMinutes: 41, tasksCompleted: 33, tasksOverdue: 0 },
  },
];

// ---------------------------------------------------------------------------
// listings
// ---------------------------------------------------------------------------
const RIYADH = { country: "المملكة العربية السعودية", region: "منطقة الرياض", city: "الرياض" };
const JEDDAH = { country: "المملكة العربية السعودية", region: "منطقة مكة المكرمة", city: "جدة" };
const DAMMAM = { country: "المملكة العربية السعودية", region: "المنطقة الشرقية", city: "الدمام" };

const LISTINGS = [
  {
    id: "demo-listing-01",
    title: "Luxury Villa in Al Malqa",
    titleAr: "فيلا فاخرة في حي الملقا",
    description: "A modern 6-bedroom villa with a private pool, driver room and a smart-home system in one of Riyadh's most sought-after districts.",
    descriptionAr: "فيلا عصرية بست غرف نوم مع مسبح خاص وغرفة سائق ونظام منزل ذكي، في أحد أرقى أحياء شمال الرياض. تشطيب فاخر وتسليم فوري.",
    type: "sale", category: "villa", price: 4250000,
    location: { ...RIYADH, district: "الملقا", address: "شارع الأمير محمد بن سلمان", lat: 24.799, lng: 46.608, preciseLocation: true },
    bedrooms: 6, bathrooms: 7, area: 480, yearBuilt: 2022, totalFloors: 2,
    amenities: { parking: 4, furnished: false, pool: true, garden: true, security: true, elevator: true, ac: true },
    status: "published", featured: true,
    images: ["photo-1613490493576-7fde63acd811", "photo-1600596542815-ffad4c1539a9", "photo-1600607687939-ce8a6c25118c"],
    assignee: "demo-emp-sales-1", views: 1840, inquiries: 42, ageDays: 41,
  },
  {
    id: "demo-listing-02",
    title: "Furnished Apartment in Al Olaya",
    titleAr: "شقة مفروشة في العليا",
    description: "Bright 3-bedroom apartment steps away from King Fahd Road, fully furnished and ready to move in.",
    descriptionAr: "شقة مضيئة بثلاث غرف نوم على بعد خطوات من طريق الملك فهد، مفروشة بالكامل وجاهزة للسكن الفوري مع موقف خاص.",
    type: "rent", category: "apartment", price: 78000, rentPeriod: "yearly",
    location: { ...RIYADH, district: "العليا", address: "طريق العروبة", lat: 24.6908, lng: 46.685, preciseLocation: true },
    bedrooms: 3, bathrooms: 2, area: 165, yearBuilt: 2019, floorNumber: 5, totalFloors: 12,
    amenities: { parking: 1, furnished: true, balcony: true, gym: true, security: true, elevator: true, ac: true },
    status: "published", featured: true,
    images: ["photo-1560448204-e02f11c3d0e2", "photo-1502672260266-1c1ef2d93688", "photo-1493809842364-78817add7ffb"],
    assignee: "demo-emp-sales-2", views: 1260, inquiries: 36, ageDays: 22,
  },
  {
    id: "demo-listing-03",
    title: "Sea-View Apartment in North Obhur",
    titleAr: "شقة بإطلالة بحرية في أبحر الشمالية",
    description: "Panoramic Red Sea views from a top-floor apartment with private beach club membership.",
    descriptionAr: "إطلالة بانورامية على البحر الأحمر من شقة في الدور العلوي، مع عضوية نادي الشاطئ الخاص وموقفين مغطّيين.",
    type: "sale", category: "apartment", price: 1850000,
    location: { ...JEDDAH, district: "أبحر الشمالية", lat: 21.74, lng: 39.09, preciseLocation: true },
    bedrooms: 4, bathrooms: 3, area: 220, yearBuilt: 2021, floorNumber: 9, totalFloors: 10,
    amenities: { parking: 2, furnished: false, balcony: true, pool: true, gym: true, security: true, elevator: true, ac: true },
    status: "published", featured: true,
    images: ["photo-1512917774080-9991f1c4c750", "photo-1502005229762-cf1b2da7c5d6"],
    assignee: "demo-emp-sales-1", views: 980, inquiries: 27, ageDays: 15,
  },
  {
    id: "demo-listing-04",
    title: "Residential Building — 12 Units",
    titleAr: "عمارة سكنية — 12 وحدة",
    description: "Income-producing residential building with independently leasable units and a stable occupancy history.",
    descriptionAr: "عمارة سكنية مدرة للدخل تضم وحدات قابلة للتأجير بشكل مستقل، مع سجل إشغال مستقر وصيانة دورية.",
    type: "sale", category: "building", price: 9800000,
    location: { ...RIYADH, district: "النرجس", lat: 24.882, lng: 46.667, preciseLocation: true },
    bedrooms: 24, bathrooms: 24, area: 1250, yearBuilt: 2017, totalFloors: 4,
    amenities: { parking: 12, elevator: true, security: true, ac: true },
    status: "published", featured: false,
    images: ["photo-1486406146926-c627a92ad1ab", "photo-1545324418-cc1a3fa10c00"],
    assignee: "demo-emp-manager", views: 640, inquiries: 19, ageDays: 63,
    units: true,
  },
  {
    id: "demo-listing-05",
    title: "Commercial Land on the Northern Ring Road",
    titleAr: "أرض تجارية على الدائري الشمالي",
    description: "Corner commercial plot with two street frontages and full utilities, ready for immediate development.",
    descriptionAr: "أرض تجارية زاوية بواجهتين على شارعين، خدمات كاملة وجاهزة للتطوير الفوري. مخطط معتمد ورخصة بناء سارية.",
    type: "sale", category: "land", price: 6400000,
    location: { ...RIYADH, district: "الياسمين", lat: 24.847, lng: 46.638, preciseLocation: false },
    area: 2000,
    amenities: {},
    status: "published", featured: false,
    images: ["photo-1500382017468-9049fed747ef", "photo-1470071459604-3b5ec3a7fe05"],
    assignee: "demo-emp-manager", views: 410, inquiries: 11, ageDays: 78,
    auction: true,
  },
  {
    id: "demo-listing-06",
    title: "Grade-A Office Floor in Al Olaya",
    titleAr: "دور مكاتب فئة A في العليا",
    description: "Fitted office floor with 40 workstations, meeting rooms and dedicated parking.",
    descriptionAr: "دور مكاتب مجهز بأربعين محطة عمل وقاعات اجتماعات ومواقف مخصصة، مع استقبال مستقل وتكييف مركزي.",
    type: "rent", category: "office", price: 420000, rentPeriod: "yearly",
    location: { ...RIYADH, district: "العليا", lat: 24.69, lng: 46.685, preciseLocation: true },
    area: 640, yearBuilt: 2018, floorNumber: 14, totalFloors: 22,
    amenities: { parking: 10, elevator: true, security: true, ac: true },
    status: "published", featured: false,
    images: ["photo-1497366754035-f200968a6e72", "photo-1497366811353-6870744d04b2"],
    assignee: "demo-emp-sales-2", views: 520, inquiries: 14, ageDays: 30,
  },
  {
    id: "demo-listing-07",
    title: "Family Townhouse in Al Rawdah",
    titleAr: "تاون هاوس عائلي في حي الروضة",
    description: "Three-storey townhouse in a gated compound with a shared pool and playground.",
    descriptionAr: "تاون هاوس من ثلاثة أدوار داخل مجمع مغلق فيه مسبح مشترك وملعب أطفال وأمن على مدار الساعة.",
    type: "rent", category: "townhouse", price: 145000, rentPeriod: "yearly",
    location: { ...JEDDAH, district: "الروضة", lat: 21.58, lng: 39.16, preciseLocation: true },
    bedrooms: 4, bathrooms: 4, area: 300, yearBuilt: 2020, totalFloors: 3,
    amenities: { parking: 2, furnished: false, garden: true, pool: true, security: true, ac: true },
    status: "published", featured: false,
    images: ["photo-1582268611958-ebfd161ef9cf", "photo-1580587771525-78b9dba3b914"],
    assignee: "demo-emp-sales-1", views: 730, inquiries: 22, ageDays: 12,
  },
  {
    id: "demo-listing-08",
    title: "Warehouse in the Second Industrial City",
    titleAr: "مستودع في المدينة الصناعية الثانية",
    description: "Insulated warehouse with 9-metre clear height, two loading docks and an office mezzanine.",
    descriptionAr: "مستودع معزول بارتفاع صافٍ 9 أمتار وبابين للتحميل وميزانين إداري، مع ساحة مناورة واسعة للشاحنات.",
    type: "rent", category: "warehouse", price: 380000, rentPeriod: "yearly",
    location: { ...DAMMAM, district: "المنطقة الصناعية الثانية", lat: 26.35, lng: 50.05, preciseLocation: false },
    area: 3200, yearBuilt: 2015,
    amenities: { parking: 20, security: true },
    status: "published", featured: false,
    images: ["photo-1553413077-190dd305871c", "photo-1600585152220-90363fe7e115"],
    assignee: "demo-emp-manager", views: 260, inquiries: 6, ageDays: 55,
  },
  {
    id: "demo-listing-09",
    title: "Off-Plan Penthouse — Delivery 2027",
    titleAr: "بنتهاوس على الخارطة — تسليم 2027",
    description: "Duplex penthouse in an upcoming waterfront tower, with an early-booking payment plan.",
    descriptionAr: "بنتهاوس دوبلكس في برج واجهة بحرية تحت الإنشاء، مع خطة سداد للحجز المبكر وخصم على الدفعة الأولى.",
    type: "off_plan", category: "penthouse", price: 3400000,
    location: { ...JEDDAH, district: "الشاطئ", lat: 21.63, lng: 39.108, preciseLocation: true },
    bedrooms: 5, bathrooms: 6, area: 410, yearBuilt: 2027, floorNumber: 28, totalFloors: 30,
    amenities: { parking: 3, pool: true, gym: true, security: true, elevator: true, ac: true },
    status: "published", featured: true,
    images: ["photo-1600607687939-ce8a6c25118c", "photo-1600566753086-00f18fb6b3ea"],
    assignee: "demo-emp-sales-2", views: 1120, inquiries: 31, ageDays: 8,
  },
  {
    id: "demo-listing-10",
    title: "Chalet with Pool on Al Kharj Road",
    titleAr: "استراحة بمسبح على طريق الخرج",
    description: "Weekend rest house on a fenced plot with a heated pool, majlis and covered barbecue area.",
    descriptionAr: "استراحة نهاية أسبوع على أرض مسورة، فيها مسبح مدفأ ومجلس ومنطقة شواء مغطاة ومواقف لعشر سيارات.",
    type: "rent", category: "rest_house", price: 1800, rentPeriod: "daily",
    location: { ...RIYADH, district: "طريق الخرج", lat: 24.55, lng: 46.85, preciseLocation: false },
    bedrooms: 3, bathrooms: 3, area: 900,
    amenities: { parking: 10, furnished: true, pool: true, garden: true, ac: true },
    status: "published", featured: false,
    images: ["photo-1567496898669-ee935f5f647a", "photo-1571003123894-1f0594d2b5d9"],
    assignee: "demo-emp-sales-1", views: 890, inquiries: 25, ageDays: 5,
  },
  {
    id: "demo-listing-11",
    title: "Studio near King Saud University",
    titleAr: "ستوديو قرب جامعة الملك سعود",
    description: "Compact furnished studio ideal for students and young professionals; utilities included.",
    descriptionAr: "ستوديو مفروش ومناسب للطلاب والموظفين الجدد، شامل الفواتير والإنترنت، على بعد دقائق من الجامعة.",
    type: "rent", category: "studio", price: 2600, rentPeriod: "monthly",
    location: { ...RIYADH, district: "النخيل", lat: 24.757, lng: 46.63, preciseLocation: true },
    bedrooms: 1, bathrooms: 1, area: 55, yearBuilt: 2016, floorNumber: 2, totalFloors: 6,
    amenities: { parking: 1, furnished: true, elevator: true, ac: true },
    status: "draft", featured: false,
    images: ["photo-1493809842364-78817add7ffb"],
    assignee: "demo-emp-data", views: 0, inquiries: 0, ageDays: 2,
  },
  {
    id: "demo-listing-12",
    title: "Retail Showroom on Tahlia Street",
    titleAr: "معرض تجاري على شارع التحلية",
    description: "Ground-floor showroom with a 14-metre glass frontage on one of Riyadh's busiest retail streets.",
    descriptionAr: "معرض في الدور الأرضي بواجهة زجاجية بطول 14 متراً على أحد أكثر شوارع الرياض حركة، مناسب للعلامات التجارية.",
    type: "rent", category: "commercial", price: 260000, rentPeriod: "yearly",
    location: { ...RIYADH, district: "السليمانية", lat: 24.704, lng: 46.717, preciseLocation: true },
    area: 180, yearBuilt: 2014, floorNumber: 0,
    amenities: { parking: 4, ac: true, security: true },
    status: "pending_review", featured: false,
    images: ["photo-1441986300917-64674bd600d8"],
    assignee: "demo-emp-data", views: 0, inquiries: 0, ageDays: 1,
  },
  {
    id: "demo-listing-13",
    title: "Villa in Al Sulaimaniyah — Sold",
    titleAr: "فيلا في السليمانية — تم البيع",
    description: "Recently sold family villa kept in the archive for reporting.",
    descriptionAr: "فيلا عائلية تم بيعها مؤخراً، محفوظة في الأرشيف لأغراض التقارير ومتابعة الأداء.",
    type: "sale", category: "villa", price: 2950000,
    location: { ...RIYADH, district: "السليمانية", lat: 24.704, lng: 46.717, preciseLocation: false },
    bedrooms: 5, bathrooms: 5, area: 360, yearBuilt: 2012,
    amenities: { parking: 3, garden: true, ac: true },
    status: "sold", featured: false,
    images: ["photo-1600585154340-be6161a56a0c"],
    assignee: "demo-emp-sales-2", views: 1520, inquiries: 48, ageDays: 120,
  },
  {
    id: "demo-listing-14",
    title: "Apartment in Al Aziziyah — Rented",
    titleAr: "شقة في العزيزية — تم التأجير",
    description: "Leased apartment retained for occupancy history.",
    descriptionAr: "شقة مؤجرة حالياً، محفوظة لمتابعة سجل الإشغال وتواريخ العقود.",
    type: "rent", category: "apartment", price: 42000, rentPeriod: "yearly",
    location: { ...JEDDAH, district: "العزيزية", lat: 21.39, lng: 39.88, preciseLocation: false },
    bedrooms: 2, bathrooms: 2, area: 110, yearBuilt: 2011,
    amenities: { parking: 1, elevator: true, ac: true },
    status: "rented", featured: false,
    images: ["photo-1502672260266-1c1ef2d93688"],
    assignee: "demo-emp-sales-1", views: 640, inquiries: 17, ageDays: 96,
  },
];

const BUILDING_UNITS = [
  { id: "unit-101", label: "شقة 101", type: "rent", status: "rented", price: 38000, rentPeriod: "yearly", area: 95, bedrooms: 2, bathrooms: 2, livingRooms: 1, kitchens: 1, floor: 1, furnished: false, tenant: { name: "عبدالله الغامدي", phone: "+966500000201", leaseEndsAt: "2026-11-30" } },
  { id: "unit-102", label: "شقة 102", type: "rent", status: "available", price: 40000, rentPeriod: "yearly", area: 105, bedrooms: 3, bathrooms: 2, livingRooms: 1, kitchens: 1, majlis: 1, floor: 1, furnished: false },
  { id: "unit-201", label: "شقة 201", type: "rent", status: "available", price: 42000, rentPeriod: "yearly", area: 110, bedrooms: 3, bathrooms: 2, livingRooms: 1, kitchens: 1, majlis: 1, floor: 2, furnished: true },
  { id: "unit-202", label: "شقة 202", type: "rent", status: "rented", price: 41000, rentPeriod: "yearly", area: 108, bedrooms: 3, bathrooms: 2, livingRooms: 1, kitchens: 1, floor: 2, furnished: false, tenant: { name: "منى السبيعي", phone: "+966500000202", leaseEndsAt: "2027-02-15" } },
  { id: "unit-301", label: "شقة 301", type: "rent", status: "available", price: 44000, rentPeriod: "yearly", area: 118, bedrooms: 3, bathrooms: 3, livingRooms: 1, kitchens: 1, majlis: 1, floor: 3, furnished: true },
  { id: "unit-401", label: "بنتهاوس 401", type: "sale", status: "available", price: 890000, area: 160, bedrooms: 4, bathrooms: 3, livingRooms: 2, kitchens: 1, majlis: 1, floor: 4, furnished: false },
];

// ---------------------------------------------------------------------------
// leads
// ---------------------------------------------------------------------------
const LEADS = [
  { id: "demo-lead-01", name: "محمد العتيبي", phone: "+966501110001", email: "m.otaibi@example.com", source: "website_form", stage: "new", quality: "qualified", priority: "high", listing: "demo-listing-01", value: 4250000, ageDays: 1, intent: "buy", budget: [3500000, 4500000], city: "الرياض", district: "الملقا", propertyType: "villa", bedrooms: 6, financing: "mortgage", timeline: "1_3_months", message: "مهتم بالفيلا في الملقا، هل يمكن ترتيب معاينة نهاية الأسبوع؟" },
  { id: "demo-lead-02", name: "هند الزهراني", phone: "+966501110002", email: "hind.z@example.com", source: "whatsapp", stage: "new", quality: "unrated", priority: "normal", listing: "demo-listing-02", value: 78000, ageDays: 1, intent: "rent", budget: [60000, 90000], city: "الرياض", district: "العليا", propertyType: "apartment", bedrooms: 3, financing: "cash", timeline: "immediate", message: "الشقة ما زالت متاحة؟" },
  { id: "demo-lead-03", name: "سعود الحربي", phone: "+966501110003", source: "phone", stage: "new", quality: "unrated", priority: "normal", value: 1500000, ageDays: 2, intent: "buy", budget: [1200000, 1800000], city: "جدة", propertyType: "apartment", bedrooms: 4, financing: "mortgage", timeline: "browsing" },
  { id: "demo-lead-04", name: "لطيفة القحطاني", phone: "+966501110004", email: "latifa@example.com", source: "marketplace", stage: "contacted", quality: "qualified", priority: "urgent", listing: "demo-listing-03", value: 1850000, ageDays: 4, assignee: "demo-emp-sales-1", intent: "buy", budget: [1700000, 2000000], city: "جدة", district: "أبحر الشمالية", propertyType: "apartment", bedrooms: 4, financing: "cash", timeline: "immediate", message: "أبحث عن شقة بإطلالة بحرية للتملك." },
  { id: "demo-lead-05", name: "تركي الدوسري", phone: "+966501110005", source: "referral", stage: "contacted", quality: "qualified", priority: "high", listing: "demo-listing-04", value: 9800000, ageDays: 9, assignee: "demo-emp-manager", intent: "invest", budget: [8000000, 11000000], city: "الرياض", propertyType: "building", financing: "cash", timeline: "1_3_months" },
  { id: "demo-lead-06", name: "أمل الشهري", phone: "+966501110006", email: "amal.s@example.com", source: "social_media", stage: "contacted", quality: "unrated", priority: "normal", listing: "demo-listing-07", value: 145000, ageDays: 6, assignee: "demo-emp-sales-1", intent: "rent", budget: [120000, 160000], city: "جدة", district: "الروضة", propertyType: "townhouse", bedrooms: 4, financing: "cash", timeline: "1_3_months" },
  { id: "demo-lead-07", name: "بدر المطيري", phone: "+966501110007", source: "walk_in", stage: "contacted", quality: "junk", priority: "normal", ageDays: 11, assignee: "demo-emp-sales-2", intent: "rent", city: "الرياض", propertyType: "studio", timeline: "browsing", message: "استفسار عام عن الأسعار." },
  { id: "demo-lead-08", name: "شركة الأفق للتجارة", phone: "+966501110008", email: "leasing@ufuq.example.com", source: "website_form", stage: "qualified", quality: "qualified", priority: "urgent", listing: "demo-listing-06", value: 420000, ageDays: 14, assignee: "demo-emp-sales-2", intent: "rent", budget: [350000, 500000], city: "الرياض", propertyType: "office", financing: "cash", timeline: "immediate", message: "نحتاج دور مكاتب لأربعين موظفاً بعقد ثلاث سنوات." },
  { id: "demo-lead-09", name: "ناصر البقمي", phone: "+966501110009", source: "phone", stage: "qualified", quality: "qualified", priority: "high", listing: "demo-listing-05", value: 6400000, ageDays: 19, assignee: "demo-emp-manager", intent: "invest", budget: [5500000, 7000000], city: "الرياض", propertyType: "land", financing: "cash", timeline: "1_3_months" },
  { id: "demo-lead-10", name: "ريما الأحمدي", phone: "+966501110010", email: "rima.a@example.com", source: "marketplace", stage: "qualified", quality: "qualified", priority: "normal", listing: "demo-listing-09", value: 3400000, ageDays: 7, assignee: "demo-emp-sales-2", intent: "buy", budget: [3000000, 3600000], city: "جدة", propertyType: "penthouse", bedrooms: 5, financing: "mortgage", timeline: "1_3_months" },
  { id: "demo-lead-11", name: "ماجد العنزي", phone: "+966501110011", source: "referral", stage: "qualified", quality: "qualified", priority: "high", listing: "demo-listing-10", value: 54000, ageDays: 3, assignee: "demo-emp-sales-1", intent: "rent", city: "الرياض", propertyType: "rest_house", financing: "cash", timeline: "immediate" },
  { id: "demo-lead-12", name: "عبدالرحمن الغامدي", phone: "+966501110012", email: "a.ghamdi@example.com", source: "website_form", stage: "deal", quality: "qualified", priority: "high", listing: "demo-listing-13", value: 2950000, ageDays: 34, assignee: "demo-emp-sales-2", intent: "buy", budget: [2700000, 3100000], city: "الرياض", district: "السليمانية", propertyType: "villa", bedrooms: 5, financing: "mortgage", timeline: "immediate" },
  { id: "demo-lead-13", name: "سلطان الرشيد", phone: "+966501110013", source: "whatsapp", stage: "deal", quality: "qualified", priority: "normal", listing: "demo-listing-14", value: 42000, ageDays: 27, assignee: "demo-emp-sales-1", intent: "rent", city: "جدة", propertyType: "apartment", bedrooms: 2, financing: "cash", timeline: "immediate" },
  { id: "demo-lead-14", name: "جواهر السالم", phone: "+966501110014", email: "j.salem@example.com", source: "social_media", stage: "deal", quality: "qualified", priority: "normal", value: 1250000, ageDays: 48, assignee: "demo-emp-manager", intent: "buy", city: "الدمام", propertyType: "apartment", bedrooms: 3, financing: "mortgage", timeline: "immediate" },
  { id: "demo-lead-15", name: "فهد الشمراني", phone: "+966501110015", source: "phone", stage: "lost", quality: "junk", priority: "normal", ageDays: 30, assignee: "demo-emp-sales-2", intent: "buy", city: "الرياض", propertyType: "apartment", timeline: "browsing", message: "الميزانية أقل من المعروض." },
  { id: "demo-lead-16", name: "دلال الخالدي", phone: "+966501110016", email: "dalal.k@example.com", source: "other", stage: "lost", quality: "unrated", priority: "normal", ageDays: 44, assignee: "demo-emp-marketing", intent: "rent", city: "جدة", propertyType: "apartment", bedrooms: 2, timeline: "browsing" },
  { id: "demo-lead-17", name: "يوسف الحمدان", phone: "+966501110017", source: "marketplace", stage: "new", quality: "unrated", priority: "normal", listing: "demo-listing-08", value: 380000, ageDays: 0.4, intent: "rent", city: "الدمام", propertyType: "warehouse", financing: "cash", timeline: "1_3_months", message: "أحتاج مستودع 3000 متر لمدة سنتين." },
  { id: "demo-lead-18", name: "عائشة الفهد", phone: "+966501110018", email: "aisha.f@example.com", source: "whatsapp", stage: "contacted", quality: "qualified", priority: "high", listing: "demo-listing-02", value: 78000, ageDays: 5, assignee: "demo-emp-marketing", intent: "rent", budget: [70000, 95000], city: "الرياض", district: "العليا", propertyType: "apartment", bedrooms: 3, financing: "cash", timeline: "immediate" },
];

const TASKS = [
  { id: "demo-task-01", title: "معاينة فيلا الملقا مع العميل محمد العتيبي", description: "تأكيد الموعد يوم الخميس الساعة 5 مساءً وإرسال الموقع عبر واتساب.", assignee: "demo-emp-sales-1", priority: "high", status: "todo", dueInDays: 1, lead: "demo-lead-01", listing: "demo-listing-01" },
  { id: "demo-task-02", title: "إرسال عرض سعر لشركة الأفق", description: "عرض إيجار دور المكاتب لثلاث سنوات مع خصم السنة الأولى.", assignee: "demo-emp-sales-2", priority: "urgent", status: "in_progress", dueInDays: 0, lead: "demo-lead-08", listing: "demo-listing-06" },
  { id: "demo-task-03", title: "تحديث صور عمارة النرجس", description: "تصوير الوحدات الشاغرة وإضافة الصور للإعلان.", assignee: "demo-emp-data", priority: "medium", status: "todo", dueInDays: 3, listing: "demo-listing-04" },
  { id: "demo-task-04", title: "متابعة عرض أرض الدائري الشمالي", description: "الاتصال بالمزايد الحالي قبل إغلاق المزايدة.", assignee: "demo-emp-manager", priority: "high", status: "in_progress", dueInDays: 2, lead: "demo-lead-09", listing: "demo-listing-05" },
  { id: "demo-task-05", title: "إعداد حملة إعلانية لبنتهاوس الشاطئ", description: "تجهيز المحتوى لإنستغرام وسناب شات لمدة أسبوعين.", assignee: "demo-emp-marketing", priority: "medium", status: "todo", dueInDays: 5, listing: "demo-listing-09" },
  { id: "demo-task-06", title: "توقيع عقد إيجار الاستراحة", description: "تجهيز العقد وتحصيل الدفعة المقدمة.", assignee: "demo-emp-sales-1", priority: "high", status: "todo", dueInDays: -1, lead: "demo-lead-11", listing: "demo-listing-10", escalated: true },
  { id: "demo-task-07", title: "أرشفة صفقة فيلا السليمانية", description: "رفع نسخة الصك وإغلاق الملف.", assignee: "demo-emp-sales-2", priority: "low", status: "done", dueInDays: -6, lead: "demo-lead-12", listing: "demo-listing-13", completedDaysAgo: 6 },
  { id: "demo-task-08", title: "مراجعة إعلان معرض التحلية", description: "التأكد من اكتمال البيانات قبل النشر.", assignee: "demo-emp-manager", priority: "medium", status: "todo", dueInDays: 1, listing: "demo-listing-12" },
  { id: "demo-task-09", title: "اتصال متابعة مع العملاء غير المؤهلين", description: "مراجعة قائمة العملاء المصنفين كغير مهتمين خلال الشهر.", assignee: "demo-emp-marketing", priority: "low", status: "in_progress", dueInDays: 4 },
  { id: "demo-task-10", title: "جرد عقود الإيجار المنتهية خلال 60 يوم", description: "إعداد قائمة بالوحدات التي ينتهي عقدها قريباً للتجديد.", assignee: "demo-emp-manager", priority: "medium", status: "done", dueInDays: -3, completedDaysAgo: 2 },
  { id: "demo-task-11", title: "إدخال بيانات 5 عقارات جديدة", description: "إدخال العقارات المستلمة من فريق المبيعات هذا الأسبوع.", assignee: "demo-emp-data", priority: "medium", status: "todo", dueInDays: 2 },
  { id: "demo-task-12", title: "تدريب الفريق على لوحة المبيعات الجديدة", description: "جلسة تدريبية لمدة ساعة على استخدام لوحة المراحل.", assignee: "demo-emp-manager", priority: "low", status: "done", dueInDays: -10, completedDaysAgo: 9 },
  // `OWNER` is replaced with the real auth uid at seed time so the logged-in
  // demo user's own "my tasks" panel isn't empty.
  { id: "demo-task-13", title: "اعتماد عرض عمارة النرجس", description: "مراجعة العرض النهائي قبل إرساله للمستثمر.", assignee: "OWNER", priority: "high", status: "todo", dueInDays: 1, lead: "demo-lead-05", listing: "demo-listing-04" },
  { id: "demo-task-14", title: "مراجعة تقرير الأداء الشهري", description: "مراجعة مؤشرات الفريق واعتماد خطة الشهر القادم.", assignee: "OWNER", priority: "medium", status: "in_progress", dueInDays: 3 },
  { id: "demo-task-15", title: "اجتماع أسبوعي مع فريق المبيعات", description: "مراجعة الصفقات المفتوحة والعوائق.", assignee: "OWNER", priority: "medium", status: "done", dueInDays: -4, completedDaysAgo: 4 },
];

// ---------------------------------------------------------------------------
// seed
// ---------------------------------------------------------------------------
const OWNER_NAME = "أحمد العتيبي";
const COMPANY_NAME_AR = "راعي العقارية — حساب تجريبي";

async function ensureAuthUser(email, password) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password,
      displayName: OWNER_NAME,
      emailVerified: true,
      disabled: false,
    });
    console.log(`[auth] Updated existing user ${email} (${user.uid}).`);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({
      email,
      password,
      displayName: OWNER_NAME,
      emailVerified: true,
    });
    console.log(`[auth] Created user ${email} (${user.uid}).`);
  }

  await auth.setCustomUserClaims(user.uid, {
    role: "company_owner",
    companyId: COMPANY_ID,
    permissions: OWNER_PERMISSIONS,
  });
  // Any session cookie minted before these claims is now stale.
  await auth.revokeRefreshTokens(user.uid);
  return user.uid;
}

async function wipe() {
  await db.recursiveDelete(db.doc(`companies/${COMPANY_ID}`));

  const mirrored = await db
    .collection("global_listings")
    .where("companyId", "==", COMPANY_ID)
    .get();
  if (!mirrored.empty) {
    const batch = db.batch();
    mirrored.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(
    `[wipe] Cleared companies/${COMPANY_ID} and ${mirrored.size} marketplace mirror doc(s).`,
  );
}

async function seed(ownerUid) {
  const w = createWriter();
  const base = `companies/${COMPANY_ID}`;

  const employeeNames = new Map([[ownerUid, OWNER_NAME]]);
  EMPLOYEES.forEach((e) => employeeNames.set(e.id, e.name));

  // --- company -------------------------------------------------------------
  // The dashboard and storefront render `name` / `title` / `description`
  // directly (the *Ar mirrors are stored but not read anywhere yet), so the
  // Arabic copy has to live in the primary field for an Arabic-first demo.
  await w.set(db.doc(base), {
    name: COMPANY_NAME_AR,
    nameAr: COMPANY_NAME_AR,
    nameEn: "Raei Demo Real Estate",
    slug: SLUG,
    description:
      "شركة عقارية تجريبية معبّأة ببيانات نموذجية للعقارات والعملاء والتقارير، مخصصة لعرض إمكانات المنصة.",
    descriptionAr:
      "شركة عقارية تجريبية معبّأة ببيانات نموذجية للعقارات والعملاء والتقارير، مخصصة لعرض إمكانات المنصة.",
    descriptionEn:
      "A demonstration real-estate company pre-loaded with sample listings, leads and reports.",
    logo: "",
    theme: {
      primaryColor: "#662d91",
      secondaryColor: "#00a99d",
      accentColor: "#0071bc",
      darkMode: false,
      heroImageUrl: img("photo-1512453979798-5ea266f8880c", 2000),
    },
    subscriptionPlan: "enterprise",
    ownerId: ownerUid,
    status: "active",
    commercialRegistrationNumber: "7001234567",
    contact: {
      phone: "+966112345678",
      whatsapp: "+966500000101",
      email: args.email,
      address: "طريق الملك فهد، الرياض",
      city: "الرياض",
      country: "المملكة العربية السعودية",
      website: "https://example.com",
      mapUrl: "https://maps.google.com/?q=24.7136,46.6753",
      socials: {
        instagram: "https://instagram.com/example",
        twitter: "https://x.com/example",
        linkedin: "https://linkedin.com/company/example",
      },
    },
    supportedLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    listingsCount: LISTINGS.length,
    activeEmployeesCount: EMPLOYEES.length + 1,
    trialEndsAt: null,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(0),
  });

  // --- settings ------------------------------------------------------------
  await w.set(db.doc(`${base}/settings/default`), {
    id: "default",
    companyId: COMPANY_ID,
    leadAutoAssign: true,
    leadAutoAssignStrategy: "round_robin",
    taskEscalationHours: 24,
    whatsappCtaNumber: "+966500000101",
    notificationEmails: [args.email],
    visibility: { leads: "all" },
    integrations: {},
    updatedAt: daysAgo(3),
  });

  // --- employees -----------------------------------------------------------
  await w.set(db.doc(`${base}/employees/${ownerUid}`), {
    id: ownerUid,
    companyId: COMPANY_ID,
    email: args.email,
    name: OWNER_NAME,
    phone: "+966500000101",
    role: "company_owner",
    permissions: OWNER_PERMISSIONS,
    permissionGroupIds: [],
    active: true,
    department: "الإدارة",
    title: "المالك التنفيذي",
    kpi: {
      ...emptyKpi(),
      listingsCreated: 6,
      listingsActive: 4,
      leadsAssigned: 12,
      leadsConverted: 5,
      dealsClosed: 3,
      avgResponseMinutes: 11,
      tasksCompleted: 18,
    },
    joinedAt: daysAgo(180),
    lastActiveAt: daysAgo(0),
    createdAt: daysAgo(180),
    updatedAt: daysAgo(0),
  });

  for (const [i, emp] of EMPLOYEES.entries()) {
    await w.set(db.doc(`${base}/employees/${emp.id}`), {
      id: emp.id,
      companyId: COMPANY_ID,
      email: emp.email,
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      permissions: ROLE_PERMISSIONS[emp.role] ?? [],
      permissionGroupIds: [],
      active: true,
      department: emp.department,
      title: emp.title,
      kpi: { ...emptyKpi(), ...emp.kpi },
      invitedBy: ownerUid,
      invitedAt: daysAgo(150),
      joinedAt: daysAgo(148),
      lastActiveAt: daysAgo(i % 3),
      createdAt: daysAgo(150),
      updatedAt: daysAgo(4),
    });
  }

  // --- permission groups ---------------------------------------------------
  const GROUPS = [
    { id: "group-sales", nameAr: "فريق المبيعات", nameEn: "Sales Team", permissions: ROLE_PERMISSIONS.sales },
    { id: "group-marketing", nameAr: "فريق التسويق", nameEn: "Marketing Team", permissions: ROLE_PERMISSIONS.marketing },
    { id: "group-listings-admin", nameAr: "إدارة العقارات", nameEn: "Listings Admin", permissions: ["create_listing", "edit_listing", "publish_listing", "feature_listing", "assign_listing", "view_owner_info"] },
  ];
  for (const g of GROUPS) {
    await w.set(db.doc(`${base}/permission_groups/${g.id}`), {
      id: g.id,
      companyId: COMPANY_ID,
      nameAr: g.nameAr,
      nameEn: g.nameEn,
      permissions: g.permissions,
      active: true,
      createdBy: ownerUid,
      createdAt: daysAgo(140),
      updatedAt: daysAgo(20),
    });
  }

  // --- pipeline stages -----------------------------------------------------
  for (const stage of PIPELINE_STAGES) {
    await w.set(db.doc(`${base}/pipeline_stages/${stage.key}`), {
      ...stage,
      companyId: COMPANY_ID,
      active: true,
      createdAt: daysAgo(170),
      updatedAt: daysAgo(170),
    });
  }

  // --- a pending invitation ------------------------------------------------
  await w.set(db.doc(`${base}/invitations/demo-invite-1`), {
    id: "demo-invite-1",
    companyId: COMPANY_ID,
    email: "new.agent.demo@example.com",
    role: "sales",
    permissions: ROLE_PERMISSIONS.sales,
    invitedBy: ownerUid,
    token: "demo-token-not-a-real-secret",
    status: "pending",
    createdAt: daysAgo(2),
    expiresAt: daysAhead(5),
  });

  // --- listings ------------------------------------------------------------
  for (const l of LISTINGS) {
    const mediaItems = media(l.images);
    const createdAt = daysAgo(l.ageDays);
    // Demo inventory stays out of the public marketplace unless --publish:
    // every would-be published listing is seeded as a draft instead, and the
    // `global_listings` mirror below is skipped for it.
    const status =
      !args.publish && l.status === "published" ? "draft" : l.status;
    const listingDoc = {
      id: l.id,
      companyId: COMPANY_ID,
      title: l.titleAr,
      titleAr: l.titleAr,
      titleEn: l.title,
      description: l.descriptionAr,
      descriptionAr: l.descriptionAr,
      descriptionEn: l.description,
      type: l.type,
      category: l.category,
      price: l.price,
      currency: "SAR",
      priceNegotiable: l.type === "sale",
      rentPeriod: l.rentPeriod ?? null,
      location: l.location,
      ...(l.bedrooms != null ? { bedrooms: l.bedrooms } : {}),
      ...(l.bathrooms != null ? { bathrooms: l.bathrooms } : {}),
      area: l.area,
      areaUnit: "sqm",
      ...(l.yearBuilt != null ? { yearBuilt: l.yearBuilt } : {}),
      ...(l.floorNumber != null ? { floorNumber: l.floorNumber } : {}),
      ...(l.totalFloors != null ? { totalFloors: l.totalFloors } : {}),
      amenities: l.amenities,
      contacts: [
        {
          name: "قسم المبيعات",
          role: "مبيعات",
          phone: "+966500000101",
          note: "متاح من 9 صباحاً حتى 6 مساءً",
        },
      ],
      details: {
        usageType:
          l.category === "land" || l.category === "commercial"
            ? "تجاري"
            : "سكني",
        propertyNumber: `PN-${l.id.slice(-2)}`,
        streetName: l.location.district ?? "",
        postalCode: "12345",
        buildingNumber: `${1000 + Number(l.id.slice(-2))}`,
        ...(l.type === "rent"
          ? { paymentCycle: "annual", deposit: Math.round(l.price * 0.05) }
          : {}),
      },
      hasPrivateData: true,
      source: l.id === "demo-listing-05" ? "broker" : "owner",
      ...(l.id === "demo-listing-05"
        ? {
            brokerInfo: {
              agencyName: "مكتب الوسيط المعتمد",
              brokerName: "سامي الحارثي",
              phone: "+966500000303",
            },
          }
        : {}),
      publishedOn: {
        aqar: status === "published",
        instagram: l.featured,
        x: false,
        facebook: false,
        snapchat: l.featured,
      },
      media: mediaItems,
      coverImage: mediaItems[0]?.url ?? "",
      assignedEmployeeId: l.assignee,
      assignedEmployeeName: employeeNames.get(l.assignee) ?? "",
      status,
      featured: l.featured,
      publishedAt: status === "published" ? createdAt : null,
      analytics: analytics(l.views, l.inquiries),
      createdBy: l.assignee,
      createdAt,
      updatedAt: daysAgo(Math.max(0, l.ageDays - 2)),
    };

    if (l.auction) {
      listingDoc.auction = {
        enabled: true,
        status: "open",
        startPrice: 6000000,
        minIncrement: 50000,
        currentBid: 6250000,
        bidCount: 3,
        highBidId: "demo-bid-3",
        highBidByEmployeeId: "demo-emp-manager",
        highBidByEmployeeName: "سارة القحطاني",
        endsAt: NOW + 6 * DAY,
        startedByEmployeeId: ownerUid,
        startedAt: daysAgo(9),
        updatedAt: daysAgo(1),
        closedAt: null,
      };
    }

    if (l.units) {
      const available = BUILDING_UNITS.filter((u) => u.status === "available");
      const prices = available.map((u) => u.price);
      const beds = available.map((u) => u.bedrooms ?? 0);
      const areas = available.map((u) => u.area ?? 0);
      listingDoc.unitsSummary = {
        total: BUILDING_UNITS.length,
        available: available.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        bedroomsMin: Math.min(...beds),
        bedroomsMax: Math.max(...beds),
        areaMin: Math.min(...areas),
        areaMax: Math.max(...areas),
        livingRoomsMax: 2,
        anyFurnished: available.some((u) => u.furnished === true),
      };
      listingDoc.publicUnits = available.map((u) => ({
        id: u.id,
        label: u.label,
        type: u.type,
        price: u.price,
        rentPeriod: u.rentPeriod ?? null,
        area: u.area ?? null,
        bedrooms: u.bedrooms ?? null,
        bathrooms: u.bathrooms ?? null,
        livingRooms: u.livingRooms ?? null,
        kitchens: u.kitchens ?? null,
        majlis: u.majlis ?? null,
        floor: u.floor ?? null,
        furnished: u.furnished === true,
        images: [img("photo-1560448204-e02f11c3d0e2")],
      }));

      for (const u of BUILDING_UNITS) {
        await w.set(db.doc(`${base}/listings/${l.id}/units/${u.id}`), {
          ...u,
          rentPeriod: u.rentPeriod ?? null,
          furnished: u.furnished === true,
          tenant: u.tenant ?? null,
          images: [img("photo-1560448204-e02f11c3d0e2")],
          imagePaths: [],
          createdBy: l.assignee,
          createdAt: daysAgo(l.ageDays),
          updatedAt: daysAgo(4),
        });
      }
    }

    await w.set(db.doc(`${base}/listings/${l.id}`), listingDoc);

    // Confidential owner/deed data (permission-gated subdoc).
    await w.set(db.doc(`${base}/listings/${l.id}/private/data`), {
      owner: {
        name: "مالك تجريبي",
        phone: "+966500000900",
        nationalId: "1000000000",
        note: "بيانات تجريبية للعرض فقط.",
      },
      deed: {
        deedType: "صك إلكتروني",
        deedNumber: `3100${l.id.slice(-2)}45678`,
        deedIssueDate: "2021-03-14",
        propertyNumber: `PN-${l.id.slice(-2)}`,
      },
      restrictedContacts: [
        { name: "الحارس", role: "حارس العقار", phone: "+966500000901" },
      ],
      updatedBy: l.assignee,
      updatedAt: daysAgo(Math.max(0, l.ageDays - 1)),
    });

    // Marketplace mirror (normally written by a Cloud Function).
    if (status === "published") {
      await w.set(db.doc(`global_listings/${l.id}`), {
        id: l.id,
        companyId: COMPANY_ID,
        companyName: COMPANY_NAME_AR,
        companySlug: SLUG,
        companyLogo: "",
        title: l.titleAr,
        titleAr: l.titleAr,
        titleEn: l.title,
        type: l.type,
        category: l.category,
        price: l.price,
        currency: "SAR",
        rentPeriod: l.rentPeriod ?? null,
        city: l.location.city,
        country: l.location.country,
        region: l.location.region,
        district: l.location.district ?? "",
        lat: l.location.lat,
        lng: l.location.lng,
        preciseLocation: l.location.preciseLocation === true,
        ...(l.bedrooms != null ? { bedrooms: l.bedrooms } : {}),
        ...(l.bathrooms != null ? { bathrooms: l.bathrooms } : {}),
        area: l.area,
        areaUnit: "sqm",
        coverImage: mediaItems[0]?.url ?? "",
        status: "published",
        featured: l.featured,
        auction: listingDoc.auction
          ? {
              enabled: true,
              status: "open",
              startPrice: 6000000,
              currentBid: 6250000,
              bidCount: 3,
              endsAt: NOW + 6 * DAY,
            }
          : null,
        ...(listingDoc.unitsSummary
          ? { unitsSummary: listingDoc.unitsSummary }
          : {}),
        createdAt,
        updatedAt: daysAgo(Math.max(0, l.ageDays - 2)),
      });
    }
  }

  // Auction bid history (audit trail).
  const BIDS = [
    { id: "demo-bid-1", amount: 6050000, employee: "demo-emp-sales-1", bidder: "ناصر البقمي", phone: "+966501110009", ageDays: 8 },
    { id: "demo-bid-2", amount: 6150000, employee: "demo-emp-sales-2", bidder: "شركة تطوير الشمال", phone: "+966501110300", ageDays: 4 },
    { id: "demo-bid-3", amount: 6250000, employee: "demo-emp-manager", bidder: "ناصر البقمي", phone: "+966501110009", ageDays: 1 },
  ];
  for (const b of BIDS) {
    await w.set(db.doc(`${base}/listings/demo-listing-05/bids/${b.id}`), {
      id: b.id,
      amount: b.amount,
      placedByEmployeeId: b.employee,
      placedByEmployeeName: employeeNames.get(b.employee) ?? "",
      bidderName: b.bidder,
      bidderPhone: b.phone,
      bidderSource: "phone",
      createdAt: daysAgo(b.ageDays),
    });
  }

  // --- leads ---------------------------------------------------------------
  const stageCounters = new Map();
  const listingTitles = new Map(LISTINGS.map((l) => [l.id, l.titleAr]));

  for (const [index, lead] of LEADS.entries()) {
    const order = (stageCounters.get(lead.stage) ?? 0) + 1;
    stageCounters.set(lead.stage, order);
    const createdAt = daysAgo(lead.ageDays);
    const contacted = lead.stage !== "new";
    const assignee = lead.assignee ?? null;
    const stageLabel =
      PIPELINE_STAGES.find((s) => s.key === lead.stage)?.labelAr ?? lead.stage;

    await w.set(db.doc(`${base}/leads/${lead.id}`), {
      id: lead.id,
      companyId: COMPANY_ID,
      reference: `#DMO-${index + 101}`,
      name: lead.name,
      phone: lead.phone,
      ...(lead.email ? { email: lead.email } : {}),
      ...(lead.message ? { message: lead.message } : {}),
      preferredContactMethod: lead.source === "whatsapp" ? "whatsapp" : "phone",
      listingId: lead.listing ?? null,
      ...(lead.listing
        ? { listingTitle: listingTitles.get(lead.listing) ?? "" }
        : {}),
      source: lead.source,
      quality: lead.quality,
      priority: lead.priority,
      requirement: {
        intent: lead.intent,
        ...(lead.propertyType ? { propertyType: lead.propertyType } : {}),
        ...(lead.city ? { city: lead.city } : {}),
        ...(lead.district ? { district: lead.district } : {}),
        ...(lead.budget
          ? { budgetMin: lead.budget[0], budgetMax: lead.budget[1] }
          : {}),
        ...(lead.bedrooms ? { bedrooms: lead.bedrooms } : {}),
        ...(lead.financing ? { financing: lead.financing } : {}),
        ...(lead.timeline ? { timeline: lead.timeline } : {}),
      },
      assignedTo: assignee,
      assignedToName: assignee ? (employeeNames.get(assignee) ?? "") : "",
      assignedAt: assignee ? daysAgo(Math.max(0, lead.ageDays - 1)) : null,
      status: lead.stage,
      stageKey: lead.stage,
      boardOrder: order * BOARD_ORDER_STEP,
      stageEnteredAt: daysAgo(Math.max(0, lead.ageDays - 2)),
      estimatedValue: lead.value ?? null,
      expectedCloseAt:
        lead.stage === "deal" || lead.stage === "lost" ? null : daysAhead(14),
      firstResponseAt: contacted
        ? daysAgo(Math.max(0, lead.ageDays - 0.2))
        : null,
      responseTimeMinutes: contacted ? 8 + ((index * 7) % 40) : null,
      notes: contacted
        ? [
            {
              id: `${lead.id}-note-1`,
              authorId: assignee ?? ownerUid,
              authorName: assignee
                ? (employeeNames.get(assignee) ?? "")
                : OWNER_NAME,
              text: "تم التواصل مع العميل وتحديد الميزانية والمنطقة المفضلة.",
              createdAt: daysAgo(Math.max(0, lead.ageDays - 1)),
            },
          ]
        : [],
      tags: lead.quality === "qualified" ? ["مؤهل", lead.intent] : [lead.intent],
      utm:
        lead.source === "social_media"
          ? {
              source: "instagram",
              medium: "paid_social",
              campaign: "summer-demo",
            }
          : {},
      createdAt,
      updatedAt: daysAgo(Math.max(0, lead.ageDays - 1)),
    });

    // Timeline
    const events = [
      {
        type: "lead_created",
        message: "تم إنشاء العميل المحتمل",
        actor: "System",
        actorId: null,
        ageDays: lead.ageDays,
      },
    ];
    if (assignee) {
      events.push({
        type: "lead_assigned",
        message: `تم إسناد العميل إلى ${employeeNames.get(assignee)}`,
        actor: OWNER_NAME,
        actorId: ownerUid,
        ageDays: Math.max(0, lead.ageDays - 0.5),
      });
    }
    if (contacted) {
      events.push({
        type: "note_added",
        message: "تم تسجيل مكالمة أولى مع العميل",
        actor: assignee ? (employeeNames.get(assignee) ?? "") : OWNER_NAME,
        actorId: assignee ?? ownerUid,
        ageDays: Math.max(0, lead.ageDays - 1),
      });
      events.push({
        type: "stage_changed",
        message: `تم نقل العميل إلى مرحلة "${stageLabel}"`,
        actor: assignee ? (employeeNames.get(assignee) ?? "") : OWNER_NAME,
        actorId: assignee ?? ownerUid,
        ageDays: Math.max(0, lead.ageDays - 2),
      });
    }
    for (const [i, ev] of events.entries()) {
      await w.set(db.doc(`${base}/leads/${lead.id}/activity/event-${i + 1}`), {
        type: ev.type,
        actorId: ev.actorId,
        actorName: ev.actor,
        message: ev.message,
        metadata: null,
        createdAt: daysAgo(ev.ageDays),
      });
    }
  }

  // --- tasks ---------------------------------------------------------------
  for (const task of TASKS) {
    const assignedTo = task.assignee === "OWNER" ? ownerUid : task.assignee;
    await w.set(db.doc(`${base}/tasks/${task.id}`), {
      id: task.id,
      companyId: COMPANY_ID,
      title: task.title,
      description: task.description,
      assignedTo,
      assignedToName: employeeNames.get(assignedTo) ?? "",
      createdBy: ownerUid,
      createdByName: OWNER_NAME,
      priority: task.priority,
      status: task.status,
      dueDate:
        task.dueInDays >= 0
          ? daysAhead(task.dueInDays)
          : daysAgo(-task.dueInDays),
      completedAt:
        task.completedDaysAgo != null ? daysAgo(task.completedDaysAgo) : null,
      escalated: task.escalated === true,
      escalatedAt: task.escalated ? daysAgo(1) : null,
      escalatedTo: task.escalated ? "demo-emp-manager" : null,
      relatedListingId: task.listing ?? null,
      relatedLeadId: task.lead ?? null,
      tags: [],
      createdAt: daysAgo(Math.abs(task.dueInDays) + 3),
      updatedAt: daysAgo(1),
    });
  }

  // --- KPI -----------------------------------------------------------------
  const period = (offset) => {
    const d = new Date(NOW);
    d.setDate(1);
    d.setMonth(d.getMonth() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const kpiPeople = [
    { id: ownerUid, name: OWNER_NAME, weight: 0.6 },
    ...EMPLOYEES.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.role === "sales" ? 1.2 : e.role === "manager" ? 1 : 0.5,
    })),
  ];

  for (let m = 0; m < 6; m += 1) {
    const p = period(m);
    const seasonal = 1 + (5 - m) * 0.06;
    for (const person of kpiPeople) {
      const leadsAssigned = Math.round(14 * person.weight * seasonal);
      const leadsConverted = Math.round(leadsAssigned * 0.28);
      const dealsClosed = Math.round(leadsConverted * 0.6);
      await w.set(db.doc(`${base}/kpi_snapshots/${p}_${person.id}`), {
        id: `${p}_${person.id}`,
        companyId: COMPANY_ID,
        employeeId: person.id,
        employeeName: person.name,
        period: p,
        listingsCreated: Math.round(4 * person.weight * seasonal),
        listingsActive: Math.round(3 * person.weight * seasonal),
        leadsAssigned,
        leadsConverted,
        conversionRate: Number(
          (leadsConverted / Math.max(1, leadsAssigned)).toFixed(2),
        ),
        dealsClosed,
        revenueGenerated: dealsClosed * 42000,
        avgResponseMinutes: Math.round(18 - person.weight * 5),
        tasksCompleted: Math.round(9 * person.weight * seasonal),
        tasksOverdue: m % 3 === 0 ? 2 : 1,
        callsMade: Math.round(45 * person.weight * seasonal),
        score: Math.round(60 + person.weight * 25),
        createdAt: daysAgo(m * 30),
      });
    }
  }

  await w.set(db.doc(`${base}/kpi/current`), {
    companyId: COMPANY_ID,
    period: period(0),
    totalListings: LISTINGS.length,
    // "Active" = anything still being worked (published, draft, in review) —
    // matches the dashboard's own definition, so it holds in draft-only mode.
    activeListings: LISTINGS.filter((l) =>
      ["published", "draft", "pending_review"].includes(l.status),
    ).length,
    totalLeads: LEADS.length,
    newLeadsThisMonth: LEADS.filter((l) => l.ageDays <= 30).length,
    convertedLeads: LEADS.filter((l) => l.stage === "deal").length,
    totalRevenue: 12450000,
    totalEmployees: EMPLOYEES.length + 1,
    avgResponseMinutes: 13,
    tasksCompleted: TASKS.filter((t) => t.status === "done").length,
    tasksOverdue: TASKS.filter((t) => t.status !== "done" && t.dueInDays < 0)
      .length,
    topPerformerId: "demo-emp-sales-1",
    topPerformerName: "خالد الشمري",
    updatedAt: daysAgo(0),
  });

  // --- notifications (owner's bell) ---------------------------------------
  const NOTIFS = [
    { id: "demo-notif-1", type: "lead_assigned", title: "عميل محتمل جديد", message: "تم إسناد العميل محمد العتيبي إليك.", leadId: "demo-lead-01", read: false, ageDays: 0.2 },
    { id: "demo-notif-2", type: "task_due", title: "مهمة تستحق اليوم", message: "إرسال عرض سعر لشركة الأفق.", taskId: "demo-task-02", read: false, ageDays: 0.5 },
    { id: "demo-notif-3", type: "lead_new", title: "طلب جديد من الموقع", message: "استفسار جديد على مستودع الدمام.", leadId: "demo-lead-17", read: false, ageDays: 1 },
    { id: "demo-notif-4", type: "deal_won", title: "صفقة مغلقة", message: "تم إغلاق صفقة فيلا السليمانية بنجاح.", leadId: "demo-lead-12", read: true, ageDays: 6 },
    { id: "demo-notif-5", type: "task_escalated", title: "مهمة متأخرة", message: "توقيع عقد إيجار الاستراحة تجاوز موعده.", taskId: "demo-task-06", read: true, ageDays: 1.5 },
  ];
  for (const n of NOTIFS) {
    await w.set(db.doc(`${base}/notifications/${n.id}`), {
      id: n.id,
      companyId: COMPANY_ID,
      recipientId: ownerUid,
      type: n.type,
      title: n.title,
      message: n.message,
      leadId: n.leadId ?? null,
      taskId: n.taskId ?? null,
      read: n.read,
      createdAt: daysAgo(n.ageDays),
      updatedAt: daysAgo(n.ageDays),
    });
  }

  // --- activity log --------------------------------------------------------
  const LOGS = [
    { id: "demo-log-1", action: "listing_published", message: "تم نشر إعلان: فيلا فاخرة في حي الملقا", actor: "demo-emp-sales-1", ageDays: 41 },
    { id: "demo-log-2", action: "employee_added", message: "تمت إضافة الموظف: نورة الدوسري", actor: "owner", ageDays: 148 },
    { id: "demo-log-3", action: "lead_converted", message: "تحويل العميل عبدالرحمن الغامدي إلى صفقة", actor: "demo-emp-sales-2", ageDays: 7 },
    { id: "demo-log-4", action: "settings_updated", message: "تم تحديث إعدادات التوزيع التلقائي للعملاء", actor: "owner", ageDays: 3 },
  ];
  for (const log of LOGS) {
    const actorId = log.actor === "owner" ? ownerUid : log.actor;
    await w.set(db.doc(`${base}/activity_logs/${log.id}`), {
      id: log.id,
      companyId: COMPANY_ID,
      action: log.action,
      message: log.message,
      actorId,
      actorName: employeeNames.get(actorId) ?? "System",
      createdAt: daysAgo(log.ageDays),
    });
  }

  await w.flush();
  return w.total;
}

async function main() {
  console.log(`[seed] Project: ${PROJECT_ID}`);
  console.log(`[seed] Demo tenant: companies/${COMPANY_ID} (slug "${SLUG}")`);

  const ownerUid = await ensureAuthUser(args.email, args.password);

  if (!args.keep) await wipe();

  const writes = await seed(ownerUid);

  console.log(`[seed] Wrote ${writes} documents.`);
  console.log("");
  console.log("Demo login ready:");
  console.log(`  email:      ${args.email}`);
  console.log(`  password:   ${args.password}`);
  console.log(`  storefront: /c/${SLUG}`);
  console.log("");
}

main().catch((error) => {
  console.error(`Failed: ${error instanceof Error ? error.stack : error}`);
  process.exit(1);
});
