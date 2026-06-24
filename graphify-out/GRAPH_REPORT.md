# Graph Report - .  (2026-06-17)

## Corpus Check
- 145 files · ~62,462 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 948 nodes · 2090 edges · 57 communities (54 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell & Auth Hooks|App Shell & Auth Hooks]]
- [[_COMMUNITY_Admin Company Detail|Admin Company Detail]]
- [[_COMMUNITY_Tasks API & Permissions|Tasks API & Permissions]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Leads API|Leads API]]
- [[_COMMUNITY_Dashboard Layout & Notifications|Dashboard Layout & Notifications]]
- [[_COMMUNITY_Listing Categories|Listing Categories]]
- [[_COMMUNITY_KPI Dashboard|KPI Dashboard]]
- [[_COMMUNITY_Invitation Accept Flow|Invitation Accept Flow]]
- [[_COMMUNITY_Listings API|Listings API]]
- [[_COMMUNITY_Cloud Functions Core|Cloud Functions Core]]
- [[_COMMUNITY_Permission Group Routes|Permission Group Routes]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Public Company Pages|Public Company Pages]]
- [[_COMMUNITY_Implementation Status & Docs|Implementation Status & Docs]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Functions Package|Functions Package]]
- [[_COMMUNITY_Admin Overview & Analytics|Admin Overview & Analytics]]
- [[_COMMUNITY_Company Member Guards|Company Member Guards]]
- [[_COMMUNITY_Employees Client UI|Employees Client UI]]
- [[_COMMUNITY_Session Cookies|Session Cookies]]
- [[_COMMUNITY_Permission Modules|Permission Modules]]
- [[_COMMUNITY_Permission UI Components|Permission UI Components]]
- [[_COMMUNITY_Custom Claims Sync|Custom Claims Sync]]
- [[_COMMUNITY_Functions TS Config|Functions TS Config]]
- [[_COMMUNITY_Permissions Helpers|Permissions Helpers]]
- [[_COMMUNITY_Settings API|Settings API]]
- [[_COMMUNITY_Admin SDK Setup Script|Admin SDK Setup Script]]
- [[_COMMUNITY_Invitations API|Invitations API]]
- [[_COMMUNITY_Marketplace Detail|Marketplace Detail]]
- [[_COMMUNITY_Roles & Permission Groups|Roles & Permission Groups]]
- [[_COMMUNITY_Invite Email Verify Script|Invite Email Verify Script]]
- [[_COMMUNITY_Employees API|Employees API]]
- [[_COMMUNITY_Company Route|Company Route]]
- [[_COMMUNITY_Company Contact Page|Company Contact Page]]
- [[_COMMUNITY_Admin Companies List|Admin Companies List]]
- [[_COMMUNITY_i18n Dictionaries|i18n Dictionaries]]
- [[_COMMUNITY_Marketplace Listings|Marketplace Listings]]
- [[_COMMUNITY_Invitation Emails|Invitation Emails]]
- [[_COMMUNITY_Auth Guards & Onboarding|Auth Guards & Onboarding]]
- [[_COMMUNITY_Routes Constants|Routes Constants]]
- [[_COMMUNITY_UI Badge & Utils|UI Badge & Utils]]
- [[_COMMUNITY_Middleware|Middleware]]
- [[_COMMUNITY_Rate Limiting|Rate Limiting]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Public Listing Detail|Public Listing Detail]]
- [[_COMMUNITY_Next Config & CSP|Next Config & CSP]]
- [[_COMMUNITY_Promote Super Admin Script|Promote Super Admin Script]]
- [[_COMMUNITY_Diagnose Session Script|Diagnose Session Script]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]

## God Nodes (most connected - your core abstractions)
1. `adminDb()` - 91 edges
2. `getSessionUser()` - 72 edges
3. `hasAnyPermission()` - 39 edges
4. `ROUTES` - 28 edges
5. `requireCompanyMember()` - 25 edges
6. `ROLES` - 24 edges
7. `Permission` - 23 edges
8. `adminAuth()` - 20 edges
9. `Role` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `AdminCompanyDetailPage()` --calls--> `NotFound()`  [INFERRED]
  src/app/(admin)/admin/companies/[companyId]/page.tsx → src/app/not-found.tsx
- `AdminCreateCompanyPage()` --calls--> `requireSuperAdmin()`  [INFERRED]
  src/app/(admin)/admin/companies/new/page.tsx → src/lib/auth/guards.ts
- `AdminLayout()` --calls--> `requireSuperAdmin()`  [EXTRACTED]
  src/app/(admin)/admin/layout.tsx → src/lib/auth/guards.ts
- `NewListingPage()` --calls--> `requireCompanyMember()`  [INFERRED]
  src/app/(company)/dashboard/listings/new/page.tsx → src/lib/auth/guards.ts
- `canManageCompanyPermissions()` --calls--> `hasAnyPermission()`  [INFERRED]
  src/app/api/companies/[companyId]/permission-groups/route.ts → src/constants/permissions.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 3 Cloud Function Automations** — implementation_status_listing_sync_automation, implementation_status_lead_round_robin_assignment, implementation_status_employee_claim_sync, implementation_status_task_escalation_workflow, implementation_status_kpi_overview_aggregation [EXTRACTED 1.00]
- **Layered Security Enforcement Flow** — readme_middleware_edge_protection, readme_server_guards, readme_firestore_rules, readme_cloud_functions [EXTRACTED 1.00]
- **Multi-Tenant Isolation Pattern** — readme_multi_tenancy_model, readme_custom_claims, readme_firestore_rules [EXTRACTED 1.00]

## Communities (57 total, 3 thin omitted)

### Community 0 - "App Shell & Auth Hooks"
Cohesion: 0.06
Nodes (38): AdminLayout(), cairo, ibmPlexArabic, manrope, metadata, tajawal, viewport, AppClaims (+30 more)

### Community 1 - "Admin Company Detail"
Cohesion: 0.06
Nodes (44): ActionResponse, AdminCompanyDetailClient(), CompanySummary, FieldProps, OwnerSummary, PLANS, CreateCompanyResponse, FieldProps (+36 more)

### Community 2 - "Tasks API & Permissions"
Cohesion: 0.08
Nodes (45): canAssignTasks(), canCompleteTasks(), canCreateTask(), canViewTasks(), hasPermission(), serializeDate(), TASK_PRIORITIES, TASK_STATUSES (+37 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.04
Nodes (46): dependencies, @abdulrysr/saudi-riyal-new-symbol-font, class-variance-authority, clsx, date-fns, firebase, firebase-admin, framer-motion (+38 more)

### Community 4 - "Leads API"
Cohesion: 0.09
Nodes (40): canAccessLeadDocument(), canAssignCompanyLeads(), canCommentOnLead(), canManageCompanyLeads(), canViewAssignedLeads(), LEAD_STATUS_VALUES, normalizeText(), parseLeadStatus() (+32 more)

### Community 5 - "Dashboard Layout & Notifications"
Cohesion: 0.06
Nodes (31): DashboardLayout(), hueFromChannels(), NotificationItem, NotificationsButton(), auth, db, firebaseApp, getApp() (+23 more)

### Community 6 - "Listing Categories"
Cohesion: 0.11
Nodes (27): LISTING_CATEGORIES, LISTING_CATEGORY_LABELS, LISTING_STATUSES, LISTING_TYPES, ListingCategory, ListingStatus, ListingType, DashboardListingsClientProps (+19 more)

### Community 7 - "KPI Dashboard"
Cohesion: 0.07
Nodes (20): LeadStatus, dateOrDash(), asNumber(), DashboardKPIPage(), KpiOverview, metadata, SnapshotRow, toDate() (+12 more)

### Community 8 - "Invitation Accept Flow"
Cohesion: 0.15
Nodes (28): AcceptInvitationBody, POST(), RouteContext, toDate(), emptyEmployeeKpi(), fallbackName(), isValidEmail(), normalizeEmail() (+20 more)

### Community 9 - "Listings API"
Cohesion: 0.17
Nodes (25): canEditCompanyListing(), isAllowedListingMediaPath(), isValidMediaType(), ListingMediaInput, normalizeListingMediaItem(), normalizeNumber(), normalizeString(), parseListingMediaArray() (+17 more)

### Community 10 - "Cloud Functions Core"
Cohesion: 0.08
Nodes (22): ACTIVE_LISTING_STATUSES, autoAssignLead, createTransporter(), currentPeriod(), db, DEAL_CLOSED_STATUSES, escalateOverdueTasks, LEAD_ASSIGNABLE_ROLES (+14 more)

### Community 11 - "Permission Group Routes"
Cohesion: 0.15
Nodes (22): canViewCompanyEmployees(), getSessionUser(), GET(), GET(), adminDb(), assignablePermissions, canManageCompanyPermissions(), DELETE() (+14 more)

### Community 12 - "Landing Page"
Cohesion: 0.09
Nodes (21): metadata, brandName, brandSubline, EliteHomepage(), featureTiles, heroBody, heroChips, heroTag (+13 more)

### Community 13 - "Public Company Pages"
Cohesion: 0.16
Nodes (17): getFirebaseDb(), CompanyLandingClient(), CompanyLandingClientProps, CompanyListingDetailClientProps, CompanyPropertiesClient(), CompanyPropertiesClientProps, getCompanyBySlug(), getCompanyListingById() (+9 more)

### Community 14 - "Implementation Status & Docs"
Cohesion: 0.12
Nodes (25): Employee Firestore-to-Auth Claim Sync, Scheduled KPI Overview Aggregation, Lead Round-Robin Assignment, Listing Sync Automation, Phase 3 Implementation Status, Scheduled Task Escalation Workflow, Cloud Functions Workspace, Firebase Auth Custom Claims (+17 more)

### Community 15 - "TypeScript Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+13 more)

### Community 16 - "Functions Package"
Cohesion: 0.10
Nodes (19): dependencies, firebase-admin, firebase-functions, listing-property, nodemailer, devDependencies, rimraf, @types/node (+11 more)

### Community 17 - "Admin Overview & Analytics"
Cohesion: 0.15
Nodes (14): AdminCreateCompanyForm(), AdminOverviewPage(), fetchListingsMetric(), fetchPlatformStats(), isMissingPublishedListingsIndex(), metadata, AdminAnalyticsPage(), metadata (+6 more)

### Community 18 - "Company Member Guards"
Cohesion: 0.14
Nodes (14): getCompanyAccessState, requireCompanyMember(), EditListingPage(), metadata, DashboardEmployeesPage(), PermissionGroupsManager(), DashboardLeadsClient(), DashboardLeadsPage() (+6 more)

### Community 19 - "Employees Client UI"
Cohesion: 0.12
Nodes (13): ASSIGNABLE_ROLES, DashboardEmployeesClientProps, DirectEmployeeForm, FieldProps, initialDirectForm, initialInviteForm, Mode, PermissionGroupOption (+5 more)

### Community 20 - "Session Cookies"
Cohesion: 0.24
Nodes (14): clearSessionCookie(), createSessionCookie(), getSessionUserCached, requireSessionUser(), SESSION_EXPIRES_DAYS, setSessionCookie(), adminApp(), adminAuth() (+6 more)

### Community 21 - "Permission Modules"
Cohesion: 0.17
Nodes (11): GROUP_ASSIGNABLE_PERMISSIONS, LocalizedLabel, PERMISSION_LABELS, PERMISSION_MODULES, PermissionModule, VIEW_PERMISSIONS, assignableSet, EmployeeAssignmentRow (+3 more)

### Community 22 - "Permission UI Components"
Cohesion: 0.20
Nodes (11): CheckboxGroup, CheckboxGroupComponent(), CheckboxGroupProps, CheckboxOption, PermissionCardProps, Card, CardContent, CardDescription (+3 more)

### Community 23 - "Custom Claims Sync"
Cohesion: 0.26
Nodes (12): canRemoveCompanyEmployees(), applyRoleClaims(), setUserClaims(), syncClaimsFromFirestore(), verifyIdTokenClaims(), permissionsForRole(), isValidRole(), clearEmployeeClaims() (+4 more)

### Community 24 - "Functions TS Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+5 more)

### Community 25 - "Permissions Helpers"
Cohesion: 0.22
Nodes (9): hasPermission(), PERMISSIONS, DashboardEmployeesClient(), metadata, DashboardListingsClient(), DashboardListingsPage(), metadata, DashboardTasksClient() (+1 more)

### Community 26 - "Settings API"
Cohesion: 0.29
Nodes (12): hasAnyPermission(), canAccessCompanySettings(), canManageBranding(), canManageOperationalSettings(), GET(), normalizeEmail(), normalizeNullableText(), normalizeText() (+4 more)

### Community 27 - "Admin SDK Setup Script"
Cohesion: 0.15
Nodes (10): __dirname, env, ENV_FILE, escapedKey, jsonFiles, jsonPath, required, ROOT (+2 more)

### Community 28 - "Invitations API"
Cohesion: 0.27
Nodes (10): serializeDate(), ROLE_LABELS, CreateInvitationBody, mapInvitationDoc(), RouteContext, isPublicHost(), isPublicUrl(), normalizeConfiguredBaseUrl() (+2 more)

### Community 29 - "Marketplace Detail"
Cohesion: 0.23
Nodes (7): LISTING_TYPE_LABELS, MarketplaceDetailClient(), MarketplaceDetailClientProps, metadata, SARPrice(), SARPriceProps, formatNumber()

### Community 30 - "Roles & Permission Groups"
Cohesion: 0.27
Nodes (8): ROLES, assignablePermissions, GET(), normalizeName(), parsePermissionList(), POST(), canManageCompanyPermissions(), RouteContext

### Community 31 - "Invite Email Verify Script"
Cohesion: 0.38
Nodes (10): createSessionCookie(), extractCookieValue(), findCompanyId(), getCredential(), main(), normalizeBaseUrl(), parseArgs(), parseErrorText() (+2 more)

### Community 32 - "Employees API"
Cohesion: 0.24
Nodes (8): ALL_PERMISSIONS, ASSIGNABLE_COMPANY_PERMISSIONS, ASSIGNABLE_EMPLOYEE_ROLES, canManageCompanyEmployees(), NON_PLATFORM_PERMISSIONS, SessionUser, DELETE(), RouteContext

### Community 33 - "Company Route"
Cohesion: 0.33
Nodes (9): ensureUniqueSlug(), fallbackOwnerName(), normalizeCompanyName(), normalizeOwnerName(), normalizePhone(), OnboardingBody, POST(), slugify() (+1 more)

### Community 34 - "Company Contact Page"
Cohesion: 0.22
Nodes (6): metadata, CompanyContactClient(), CompanyContactClientProps, ContactForm, FieldProps, initialForm

### Community 35 - "Admin Companies List"
Cohesion: 0.25
Nodes (5): AdminCompaniesPage(), CompanyListRow, fetchCompanies(), metadata, STATUS_CLASS

### Community 36 - "i18n Dictionaries"
Cohesion: 0.22
Nodes (6): dictionaries, Dictionary, Locale, LOCALE_DIR, LOCALE_LABELS, SUPPORTED_LOCALES

### Community 37 - "Marketplace Listings"
Cohesion: 0.33
Nodes (5): PublicListing, ListingCard(), ListingCardProps, MarketplaceClient(), metadata

### Community 38 - "Invitation Emails"
Cohesion: 0.39
Nodes (7): createTransport(), displayDate(), escapeHtml(), InvitationEmailInput, InvitationEmailResult, parseBoolean(), sendInvitationEmail()

### Community 39 - "Auth Guards & Onboarding"
Cohesion: 0.48
Nodes (5): requireAuth(), requirePermission(), requireRole(), metadata, OnboardingPage()

### Community 40 - "Routes Constants"
Cohesion: 0.33
Nodes (4): AUTH_PREFIXES, PROTECTED_PREFIXES, ROUTES, metadata

### Community 41 - "UI Badge & Utils"
Cohesion: 0.53
Nodes (4): Badge(), BadgeProps, badgeVariants, cn()

### Community 42 - "Middleware"
Cohesion: 0.40
Nodes (3): AUTH_PAGES, config, PROTECTED_PREFIXES

### Community 43 - "Rate Limiting"
Cohesion: 0.40
Nodes (3): RateLimitResult, store, Window

### Community 44 - "Dashboard Page"
Cohesion: 0.67
Nodes (3): DashboardPage(), fetchStats(), metadata

### Community 46 - "Next Config & CSP"
Cohesion: 0.50
Nodes (3): CSP, nextConfig, securityHeaders

### Community 47 - "Promote Super Admin Script"
Cohesion: 0.83
Nodes (3): getCredential(), main(), parseArgs()

## Knowledge Gaps
- **329 isolated node(s):** `name`, `private`, `main`, `node`, `build` (+324 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `adminDb()` connect `Permission Group Routes` to `Admin Company Detail`, `Tasks API & Permissions`, `Leads API`, `Dashboard Layout & Notifications`, `Listing Categories`, `KPI Dashboard`, `Invitation Accept Flow`, `Listings API`, `Admin Overview & Analytics`, `Company Member Guards`, `Session Cookies`, `Custom Claims Sync`, `Permissions Helpers`, `Settings API`, `Invitations API`, `Roles & Permission Groups`, `Employees API`, `Company Route`, `Admin Companies List`, `Auth Guards & Onboarding`, `Dashboard Page`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `firebase-admin` connect `Package Dependencies` to `Session Cookies`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `adminDb()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`adminDb()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getSessionUser()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`getSessionUser()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `main` to the rest of the system?**
  _330 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Auth Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.055523085914669784 - nodes in this community are weakly interconnected._
- **Should `Admin Company Detail` be split into smaller, more focused modules?**
  _Cohesion score 0.05889724310776942 - nodes in this community are weakly interconnected._