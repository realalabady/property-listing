import { PERMISSIONS, type Permission } from "@/constants/permissions";

type LocalizedLabel = {
  en: string;
  ar: string;
};

export interface PermissionModule {
  id: string;
  title: LocalizedLabel;
  permissions: Permission[];
}

export const GROUP_ASSIGNABLE_PERMISSIONS: Permission[] = [
  PERMISSIONS.CREATE_LISTING,
  PERMISSIONS.EDIT_LISTING,
  PERMISSIONS.EDIT_OWN_LISTING,
  PERMISSIONS.DELETE_LISTING,
  PERMISSIONS.PUBLISH_LISTING,
  PERMISSIONS.ASSIGN_LISTING,
  PERMISSIONS.FEATURE_LISTING,
  PERMISSIONS.CREATE_EMPLOYEE,
  PERMISSIONS.EDIT_EMPLOYEE,
  PERMISSIONS.REMOVE_EMPLOYEE,
  PERMISSIONS.VIEW_EMPLOYEES,
  PERMISSIONS.MANAGE_PERMISSION_GROUPS,
  PERMISSIONS.CREATE_TASK,
  PERMISSIONS.ASSIGN_TASKS,
  PERMISSIONS.ESCALATE_TASKS,
  PERMISSIONS.COMPLETE_TASKS,
  PERMISSIONS.MANAGE_LEADS,
  PERMISSIONS.VIEW_OWN_LEADS,
  PERMISSIONS.ASSIGN_LEADS,
  PERMISSIONS.VIEW_KPI,
  PERMISSIONS.VIEW_OWN_KPI,
  PERMISSIONS.EXPORT_REPORTS,
  PERMISSIONS.COMPANY_SETTINGS_ACCESS,
  PERMISSIONS.BILLING_ACCESS,
  PERMISSIONS.MANAGE_BRANDING,
];

export const PERMISSION_LABELS: Record<Permission, LocalizedLabel> = {
  [PERMISSIONS.CREATE_LISTING]: { en: "Create listing", ar: "انشاء عقار" },
  [PERMISSIONS.EDIT_LISTING]: { en: "Edit listing", ar: "تعديل العقار" },
  [PERMISSIONS.EDIT_OWN_LISTING]: { en: "Edit own listing", ar: "تعديل عقاري" },
  [PERMISSIONS.DELETE_LISTING]: { en: "Delete listing", ar: "حذف العقار" },
  [PERMISSIONS.PUBLISH_LISTING]: { en: "Publish listing", ar: "نشر العقار" },
  [PERMISSIONS.ASSIGN_LISTING]: { en: "Assign listing", ar: "اسناد العقار" },
  [PERMISSIONS.FEATURE_LISTING]: { en: "Feature listing", ar: "تمييز العقار" },

  [PERMISSIONS.CREATE_EMPLOYEE]: { en: "Create employee", ar: "انشاء موظف" },
  [PERMISSIONS.EDIT_EMPLOYEE]: { en: "Edit employee", ar: "تعديل الموظف" },
  [PERMISSIONS.REMOVE_EMPLOYEE]: { en: "Remove employee", ar: "حذف الموظف" },
  [PERMISSIONS.VIEW_EMPLOYEES]: { en: "View employees", ar: "عرض الموظفين" },
  [PERMISSIONS.MANAGE_PERMISSION_GROUPS]: {
    en: "Manage permission groups",
    ar: "ادارة مجموعات الصلاحيات",
  },

  [PERMISSIONS.CREATE_TASK]: { en: "Create task", ar: "انشاء مهمة" },
  [PERMISSIONS.ASSIGN_TASKS]: { en: "Assign tasks", ar: "اسناد المهام" },
  [PERMISSIONS.ESCALATE_TASKS]: { en: "Escalate tasks", ar: "تصعيد المهام" },
  [PERMISSIONS.COMPLETE_TASKS]: { en: "Complete tasks", ar: "اكمال المهام" },

  [PERMISSIONS.MANAGE_LEADS]: {
    en: "Manage leads",
    ar: "ادارة العملاء المحتملين",
  },
  [PERMISSIONS.VIEW_OWN_LEADS]: { en: "View own leads", ar: "عرض عملائي" },
  [PERMISSIONS.ASSIGN_LEADS]: { en: "Assign leads", ar: "اسناد العملاء" },

  [PERMISSIONS.VIEW_KPI]: { en: "View KPI", ar: "عرض مؤشرات الاداء" },
  [PERMISSIONS.VIEW_OWN_KPI]: {
    en: "View own KPI",
    ar: "عرض مؤشراتي",
  },
  [PERMISSIONS.EXPORT_REPORTS]: { en: "Export reports", ar: "تصدير التقارير" },

  [PERMISSIONS.COMPANY_SETTINGS_ACCESS]: {
    en: "Company settings access",
    ar: "الوصول لاعدادات الشركة",
  },
  [PERMISSIONS.BILLING_ACCESS]: { en: "Billing access", ar: "الوصول للفوترة" },
  [PERMISSIONS.MANAGE_BRANDING]: { en: "Manage branding", ar: "ادارة الهوية" },

  [PERMISSIONS.PLATFORM_MANAGE_COMPANIES]: {
    en: "Platform manage companies",
    ar: "ادارة شركات المنصة",
  },
  [PERMISSIONS.PLATFORM_MANAGE_BILLING]: {
    en: "Platform manage billing",
    ar: "ادارة فوترة المنصة",
  },
  [PERMISSIONS.PLATFORM_VIEW_ANALYTICS]: {
    en: "Platform analytics",
    ar: "تحليلات المنصة",
  },
};

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "dashboard",
    title: { en: "Dashboard and reporting", ar: "لوحة التحكم والتقارير" },
    permissions: [
      PERMISSIONS.VIEW_KPI,
      PERMISSIONS.VIEW_OWN_KPI,
      PERMISSIONS.EXPORT_REPORTS,
    ],
  },
  {
    id: "listings",
    title: { en: "Listings and inventory", ar: "العقارات والمخزون" },
    permissions: [
      PERMISSIONS.CREATE_LISTING,
      PERMISSIONS.EDIT_LISTING,
      PERMISSIONS.EDIT_OWN_LISTING,
      PERMISSIONS.DELETE_LISTING,
      PERMISSIONS.PUBLISH_LISTING,
      PERMISSIONS.ASSIGN_LISTING,
      PERMISSIONS.FEATURE_LISTING,
    ],
  },
  {
    id: "crm",
    title: { en: "Leads and CRM", ar: "العملاء المحتملون وادارة العلاقات" },
    permissions: [
      PERMISSIONS.MANAGE_LEADS,
      PERMISSIONS.VIEW_OWN_LEADS,
      PERMISSIONS.ASSIGN_LEADS,
    ],
  },
  {
    id: "employees",
    title: { en: "Employees and access", ar: "الموظفون والصلاحيات" },
    permissions: [
      PERMISSIONS.VIEW_EMPLOYEES,
      PERMISSIONS.CREATE_EMPLOYEE,
      PERMISSIONS.EDIT_EMPLOYEE,
      PERMISSIONS.REMOVE_EMPLOYEE,
      PERMISSIONS.MANAGE_PERMISSION_GROUPS,
    ],
  },
  {
    id: "tasks",
    title: { en: "Tasks and operations", ar: "المهام والعمليات" },
    permissions: [
      PERMISSIONS.CREATE_TASK,
      PERMISSIONS.ASSIGN_TASKS,
      PERMISSIONS.ESCALATE_TASKS,
      PERMISSIONS.COMPLETE_TASKS,
    ],
  },
  {
    id: "company",
    title: { en: "Company and billing", ar: "الشركة والفوترة" },
    permissions: [
      PERMISSIONS.COMPANY_SETTINGS_ACCESS,
      PERMISSIONS.BILLING_ACCESS,
      PERMISSIONS.MANAGE_BRANDING,
    ],
  },
];

export const VIEW_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_EMPLOYEES,
  PERMISSIONS.VIEW_OWN_LEADS,
  PERMISSIONS.VIEW_KPI,
  PERMISSIONS.VIEW_OWN_KPI,
];
