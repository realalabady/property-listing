import type { Timestamp } from "firebase/firestore";
import type { Permission } from "@/constants/permissions";

export interface PermissionGroup {
  id: string;
  companyId: string;
  nameEn: string;
  nameAr: string;
  permissions: Permission[];
  active: boolean;
  createdBy: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
