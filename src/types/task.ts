import type { Timestamp } from "firebase/firestore";
import type { TaskPriority, TaskStatus } from "@/constants/listing-categories";

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description?: string;

  assignedTo: string; // employee uid
  assignedToName?: string; // denormalized
  createdBy: string;
  createdByName?: string;

  priority: TaskPriority;
  status: TaskStatus;

  dueDate: Timestamp | Date;
  completedAt?: Timestamp | Date | null;

  escalated: boolean;
  escalatedAt?: Timestamp | Date | null;
  escalatedTo?: string | null; // manager/admin uid

  relatedListingId?: string | null;
  relatedLeadId?: string | null;

  tags?: string[];

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}
