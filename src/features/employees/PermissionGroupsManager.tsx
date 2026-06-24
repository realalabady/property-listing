"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  GROUP_ASSIGNABLE_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_MODULES,
  VIEW_PERMISSIONS,
} from "@/constants/permission-modules";
import type { Permission } from "@/constants/permissions";
import { PermissionCard } from "@/components/permissions/PermissionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface PermissionGroupDto {
  id: string;
  companyId: string;
  nameEn: string;
  nameAr: string;
  permissions: Permission[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface EmployeeAssignmentRow {
  id: string;
  name: string;
  role: string;
  permissionGroupIds: string[];
}

interface PermissionGroupsManagerProps {
  companyId: string;
  employees: EmployeeAssignmentRow[];
}

const assignableSet = new Set<Permission>(GROUP_ASSIGNABLE_PERMISSIONS);

function sanitizePermissions(raw: unknown): Permission[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (value): value is Permission =>
      typeof value === "string" && assignableSet.has(value as Permission),
  );
}

function formatDate(value: string | null): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PermissionGroupsManager({
  companyId,
  employees: initialEmployees,
}: PermissionGroupsManagerProps) {
  const [groups, setGroups] = useState<PermissionGroupDto[]>([]);
  const [employees, setEmployees] =
    useState<EmployeeAssignmentRow[]>(initialEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    initialEmployees[0]?.id ?? null,
  );
  const [selectedEmployeeGroups, setSelectedEmployeeGroups] = useState<
    Set<string>
  >(new Set(initialEmployees[0]?.permissionGroupIds ?? []));
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<
    Set<Permission>
  >(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const dashboardRef = useRef<HTMLInputElement | null>(null);
  const viewRef = useRef<HTMLInputElement | null>(null);

  const selectedCount = selectedPermissions.size;
  const allCount = GROUP_ASSIGNABLE_PERMISSIONS.length;
  const isAllSelected = selectedCount > 0 && selectedCount === allCount;
  const isAllIndeterminate = selectedCount > 0 && selectedCount < allCount;

  const dashboardPermissions = useMemo(
    () =>
      PERMISSION_MODULES.find((module) => module.id === "dashboard")
        ?.permissions ?? [],
    [],
  );

  const dashboardCount = dashboardPermissions.filter((perm) =>
    selectedPermissions.has(perm),
  ).length;
  const dashboardChecked =
    dashboardCount > 0 && dashboardCount === dashboardPermissions.length;
  const dashboardIndeterminate =
    dashboardCount > 0 && dashboardCount < dashboardPermissions.length;

  const viewCount = VIEW_PERMISSIONS.filter((perm) =>
    selectedPermissions.has(perm),
  ).length;
  const viewChecked = viewCount > 0 && viewCount === VIEW_PERMISSIONS.length;
  const viewIndeterminate =
    viewCount > 0 && viewCount < VIEW_PERMISSIONS.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isAllIndeterminate;
    }
  }, [isAllIndeterminate]);

  useEffect(() => {
    if (dashboardRef.current) {
      dashboardRef.current.indeterminate = dashboardIndeterminate;
    }
  }, [dashboardIndeterminate]);

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.indeterminate = viewIndeterminate;
    }
  }, [viewIndeterminate]);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  useEffect(() => {
    if (employees.length === 0) {
      setSelectedEmployeeId(null);
      setSelectedEmployeeGroups(new Set());
      return;
    }

    setSelectedEmployeeId((prev) =>
      prev && employees.some((employee) => employee.id === prev)
        ? prev
        : (employees[0]?.id ?? null),
    );
  }, [employees]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setSelectedEmployeeGroups(new Set());
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === selectedEmployeeId,
    );
    setSelectedEmployeeGroups(
      new Set(selectedEmployee?.permissionGroupIds ?? []),
    );
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (groups.length === 0) return;

    const availableGroupIds = new Set(groups.map((group) => group.id));

    setSelectedEmployeeGroups(
      (prev) =>
        new Set(
          Array.from(prev).filter((groupId) => availableGroupIds.has(groupId)),
        ),
    );
    setEmployees((prev) =>
      prev.map((employee) => ({
        ...employee,
        permissionGroupIds: employee.permissionGroupIds.filter((groupId) =>
          availableGroupIds.has(groupId),
        ),
      })),
    );
  }, [groups]);

  const resetForm = useCallback(() => {
    setSelectedGroupId(null);
    setNameEn("");
    setNameAr("");
    setSelectedPermissions(new Set());
    setError(null);
  }, []);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/permission-groups`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await response.json()) as {
        error?: string;
        groups?: PermissionGroupDto[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load permission groups.");
      }

      const normalized = (data.groups ?? []).map((group) => ({
        ...group,
        permissions: sanitizePermissions(group.permissions),
      }));

      setGroups(normalized);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load permission groups.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const setPermissionChecked = useCallback(
    (permission: Permission, checked: boolean) => {
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(permission);
        } else {
          next.delete(permission);
        }
        return next;
      });
    },
    [],
  );

  const setManyPermissionsChecked = useCallback(
    (permissions: Permission[], checked: boolean) => {
      setSelectedPermissions((prev) => {
        const next = new Set(prev);
        for (const permission of permissions) {
          if (checked) {
            next.add(permission);
          } else {
            next.delete(permission);
          }
        }
        return next;
      });
    },
    [],
  );

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const payload = {
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        permissions: Array.from(selectedPermissions),
      };

      if (!payload.nameEn || !payload.nameAr) {
        setError("ادخل اسم المجموعة بالعربية والانجليزية.");
        return;
      }

      if (payload.permissions.length === 0) {
        setError("اختر صلاحية واحدة على الاقل.");
        return;
      }

      setIsSaving(true);

      try {
        const endpoint = selectedGroupId
          ? `/api/companies/${companyId}/permission-groups/${selectedGroupId}`
          : `/api/companies/${companyId}/permission-groups`;

        const response = await fetch(endpoint, {
          method: selectedGroupId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as {
          error?: string;
          group?: PermissionGroupDto;
        };

        if (!response.ok) {
          throw new Error(data.error || "Failed to save permission group.");
        }

        await loadGroups();

        if (data.group) {
          setSelectedGroupId(data.group.id);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save permission group.";
        setError(message);
      } finally {
        setIsSaving(false);
      }
    },
    [
      companyId,
      loadGroups,
      nameAr,
      nameEn,
      selectedGroupId,
      selectedPermissions,
    ],
  );

  const onDeleteGroup = useCallback(
    async (groupId: string) => {
      if (
        !window.confirm("سيتم حذف المجموعة من جميع الموظفين. هل تريد المتابعة؟")
      ) {
        return;
      }

      setIsDeletingId(groupId);
      setError(null);

      try {
        const response = await fetch(
          `/api/companies/${companyId}/permission-groups/${groupId}`,
          {
            method: "DELETE",
          },
        );

        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to delete group.");
        }

        if (selectedGroupId === groupId) {
          resetForm();
        }

        await loadGroups();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete group.";
        setError(message);
      } finally {
        setIsDeletingId(null);
      }
    },
    [companyId, loadGroups, resetForm, selectedGroupId],
  );

  const onSelectGroup = useCallback((group: PermissionGroupDto) => {
    setSelectedGroupId(group.id);
    setNameEn(group.nameEn);
    setNameAr(group.nameAr);
    setSelectedPermissions(new Set(group.permissions));
    setError(null);
  }, []);

  const toggleEmployeeGroup = useCallback(
    (groupId: string, checked: boolean) => {
      setSelectedEmployeeGroups((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(groupId);
        } else {
          next.delete(groupId);
        }
        return next;
      });
    },
    [],
  );

  const saveEmployeeAssignment = useCallback(async () => {
    if (!selectedEmployeeId) {
      setError("اختر موظفا قبل الحفظ.");
      return;
    }

    setIsAssigning(true);
    setAssignMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/companies/${companyId}/employees/${selectedEmployeeId}/permission-groups`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissionGroupIds: Array.from(selectedEmployeeGroups),
          }),
        },
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign groups to employee.");
      }

      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployeeId
            ? {
                ...employee,
                permissionGroupIds: Array.from(selectedEmployeeGroups),
              }
            : employee,
        ),
      );
      setAssignMessage("تم حفظ اسناد المجموعات للموظف.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to assign groups to employee.";
      setError(message);
    } finally {
      setIsAssigning(false);
    }
  }, [companyId, selectedEmployeeGroups, selectedEmployeeId]);

  return (
    <div dir="rtl" className="space-y-6">
      <header className="space-y-2 text-right">
        <h2 className="text-2xl font-semibold tracking-tight">
          ادارة مجموعات الصلاحيات
        </h2>
        <p className="text-sm text-muted-foreground">
          انشئ مجموعات قابلة لاعادة الاستخدام ثم اسندها للموظفين مع تحكم هرمي
          كامل.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">
            {selectedGroupId
              ? "تعديل مجموعة الصلاحيات"
              : "مجموعة صلاحيات جديدة"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-right">
                <span className="text-sm font-medium">
                  اسم المجموعة بالعربية
                </span>
                <input
                  value={nameAr}
                  onChange={(event) => setNameAr(event.target.value)}
                  placeholder="مثال: فريق المبيعات"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-right text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="space-y-1 text-right">
                <span className="text-sm font-medium">
                  Group Name (English)
                </span>
                <input
                  value={nameEn}
                  onChange={(event) => setNameEn(event.target.value)}
                  placeholder="Example: Sales Team"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-left text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  dir="ltr"
                />
              </label>
            </div>

            <section className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(event) =>
                    setManyPermissionsChecked(
                      GROUP_ASSIGNABLE_PERMISSIONS,
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">تحديد كل الصلاحيات</span>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                <input
                  ref={dashboardRef}
                  type="checkbox"
                  checked={dashboardChecked}
                  onChange={(event) =>
                    setManyPermissionsChecked(
                      dashboardPermissions,
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">لوحة التحكم</span>
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                <input
                  ref={viewRef}
                  type="checkbox"
                  checked={viewChecked}
                  onChange={(event) =>
                    setManyPermissionsChecked(
                      VIEW_PERMISSIONS,
                      event.target.checked,
                    )
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium">صلاحيات العرض</span>
              </label>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              {PERMISSION_MODULES.map((module) => {
                const moduleCount = module.permissions.filter((perm) =>
                  selectedPermissions.has(perm),
                ).length;
                const moduleChecked =
                  moduleCount > 0 && moduleCount === module.permissions.length;
                const moduleIndeterminate =
                  moduleCount > 0 && moduleCount < module.permissions.length;

                return (
                  <PermissionCard
                    key={module.id}
                    title={module.title.ar}
                    checked={moduleChecked}
                    indeterminate={moduleIndeterminate}
                    onToggleCard={(nextChecked) =>
                      setManyPermissionsChecked(module.permissions, nextChecked)
                    }
                    options={module.permissions.map((permission) => ({
                      id: permission,
                      label: PERMISSION_LABELS[permission]?.ar ?? permission,
                      checked: selectedPermissions.has(permission),
                    }))}
                    onToggleOption={(permissionId, nextChecked) =>
                      setPermissionChecked(
                        permissionId as Permission,
                        nextChecked,
                      )
                    }
                  />
                );
              })}
            </section>

            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSaving}
              >
                اعادة تعيين
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "جاري الحفظ..."
                  : selectedGroupId
                    ? "حفظ التعديلات"
                    : "حفظ المجموعة"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">اسناد المجموعات للموظفين</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا يوجد موظفون للاسناد حاليا.
            </p>
          ) : (
            <>
              <label className="space-y-1 text-right">
                <span className="text-sm font-medium">اختر الموظف</span>
                <select
                  value={selectedEmployeeId ?? ""}
                  onChange={(event) => {
                    setSelectedEmployeeId(event.target.value || null);
                    setAssignMessage(null);
                  }}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.role})
                    </option>
                  ))}
                </select>
              </label>

              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  انشئ مجموعة صلاحيات واحدة على الاقل قبل الاسناد.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeGroups.has(group.id)}
                        onChange={(event) =>
                          toggleEmployeeGroup(group.id, event.target.checked)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="flex-1 text-right text-sm">
                        {group.nameAr}
                        <span
                          className="mr-2 text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          ({group.nameEn})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {assignMessage ? (
                <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  {assignMessage}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={saveEmployeeAssignment}
                  disabled={
                    !selectedEmployeeId || isAssigning || groups.length === 0
                  }
                >
                  {isAssigning ? "جاري الحفظ..." : "حفظ اسناد الموظف"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">المجموعات المحفوظة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              جاري تحميل المجموعات...
            </p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد مجموعات محفوظة بعد.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <article
                  key={group.id}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-background/80 p-4",
                    selectedGroupId === group.id && "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 text-right">
                      <p className="font-semibold">{group.nameAr}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {group.nameEn}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.permissions.length} صلاحية • اخر تحديث{" "}
                        {formatDate(group.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectGroup(group)}
                      >
                        تعديل
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={isDeletingId === group.id}
                        onClick={() => onDeleteGroup(group.id)}
                      >
                        {isDeletingId === group.id ? "جاري الحذف..." : "حذف"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
