# CPU Time Monitoring Dashboard - System Architecture

## 1. Overview
This document outlines the architecture for a full-stack CPU monitoring dashboard designed to measure the performance impact of Kameleoon script. The system consists of a React frontend, a Node.js/GraphQL backend, a PostgreSQL database, and background workers for Lighthouse analysis.

## 2. Technology Stack
- **Frontend**: React (Vite), Apollo Client, Tailwind CSS, Recharts
- **Backend**: Node.js, Apollo Server (GraphQL), Prisma ORM
- **Database**: PostgreSQL
- **Queue/Worker**: BullMQ (Redis) or DB-backed queue for Lighthouse jobs
- **Infrastructure**: Railway (Web Service + Worker Service + Postgres + Redis)

## 3. Data Model (PostgreSQL + Prisma)

### Core Entities
1.  **Account**
    *   Represents a client (e.g., "Michelin").
    *   Fields: `id`, `name`, `country`, `tamName`.
    *   Relations: Has many `Domains`.
2.  **Domain**
    *   Represents a website domain (e.g., "michelin.fr").
    *   Fields: `id`, `name`, `sitecode` (default for pages).
    *   Relations: Belongs to `Account`, Has many `Pages`.
3.  **Page**
    *   Represents a specific URL to analyze.
    *   Fields: `id`, `url`, `sitecode` (optional override).
    *   Relations: Belongs to `Domain`, Has many `DailyAnalyses`.
4.  **DailyAnalysis**
    *   Stores the aggregated result for a specific day.
    *   Fields: `id`, `date`, `desktopCpuAvg`, `mobileCpuAvg`, `tool` (Kameleoon).
    *   Relations: Belongs to `Page`.
5.  **Comment**
    *   Annotations for specific dates on the timeline.
    *   Fields: `id`, `date`, `text`, `entityType` (Account/Domain/Page), `entityId`.

### Indexing Strategy
-   Compound index on `DailyAnalysis(pageId, date)` for fast time-series retrieval.
-   Index on `Page(domainId)` and `Domain(accountId)` for hierarchical fetching.

## 4. Backend Architecture

### API Service (Node.js + Apollo Server)
-   **Responsibility**: Handles UI requests, CRUD operations, and triggers analysis jobs.
-   **GraphQL Schema**: Defines the contract for fetching hierarchy and history.
-   **Resolvers**: Use Prisma to query DB. Aggregations (Account/Domain averages) are calculated on-the-fly or via DB views for performance.

### Worker Service (Node.js + BullMQ)
-   **Responsibility**: Executes Lighthouse audits in isolation.
-   **Process**:
    1.  Receives job `{ pageId, url, runs: 5 }`.
    2.  Launches Headless Chrome (via `chrome-launcher`).
    3.  Runs Lighthouse 5 times for Desktop and 5 times for Mobile.
    4.  Calculates averages.
    5.  Upserts `DailyAnalysis` record in Postgres.
-   **Concurrency**: Configurable (e.g., 2-4 concurrent jobs) to avoid overloading the host CPU.

## 5. Frontend Architecture (React)

### Component Structure
-   **Layout**: Sidebar/Tabs (Kameleoon), Main Content Area.
-   **HierarchyTree**:
    -   `AccountRow` (Expandable)
        -   `DomainList`
            -   `DomainRow` (Expandable)
                -   `PageList`
                    -   `PageRow` (Actions: Run Analysis, Edit, Delete)
-   **DashboardWidgets**:
    -   `TimeSeriesChart`: Recharts line chart with custom tooltips and comment markers.
    -   `CpuBadge`: Component taking `value` and rendering Green/Warning/Danger/Critical colors.

### State Management
-   **Apollo Client Cache**: Primary state for server data. Normalized caching ensures UI updates automatically after mutations.
-   **Local State**: React `useState`/`useReducer` for UI toggles (expanded rows), form inputs, and active filters.

### Design System (Kameleoon-inspired)
-   **Colors**:
    -   Success: `#00C853` (≤ 500ms)
    -   Warning: `#FFD600` (> 500ms)
    -   Danger: `#FF6D00` (> 1000ms)
    -   Critical: `#D50000` (> 2000ms)
-   **Typography**: Clean sans-serif (Inter or Roboto).

## 6. API Design (GraphQL)

### Key Queries
-   `getHierarchy(filters: FilterInput)`: Fetches the full nested tree (Accounts -> Domains -> Pages) with latest stats.
-   `getHistory(entityId: ID!, type: EntityType!, dateRange: DateRangeInput)`: Fetches time-series data for charts.

### Key Mutations
-   `triggerAnalysis(pageId: ID!)`: Enqueues a job.
-   `updateAccount(...)`, `updateDomain(...)`, `updatePage(...)`: CRUD.
-   `addComment(...)`: Adds context to the timeline.

## 7. Performance & Scaling
-   **Database**: Postgres is robust. Aggregations for "Account Average" can be cached or materialized if the dataset grows huge.
-   **Worker**: Decoupled from API. Can scale horizontally on Railway by adding more worker replicas.
-   **Frontend**: Virtualization (e.g., `react-window`) for the Account list if managing thousands of accounts.

## 8. Security
-   **Authentication**: Ready for JWT-based auth (e.g., Auth0 or custom).
-   **Authorization**: Role-based access control (RBAC) logic in GraphQL resolvers (e.g., only Admins can delete Accounts).

## 9. Folder Structure
```
/
├── api/                # Backend API
│   ├── src/
│   │   ├── graphql/    # Schema & Resolvers
│   │   ├── prisma/     # DB Client
│   │   └── services/   # Business Logic
├── worker/             # Lighthouse Worker
│   ├── src/
│   │   ├── jobs/       # Job Processors
│   │   └── lighthouse/ # Lighthouse Wrapper
├── web/                # React Frontend
│   ├── src/
│   │   ├── components/ # UI Components
│   │   ├── pages/      # Route Pages
│   │   └── graphql/    # Generated Hooks
├── prisma/             # Shared Schema
└── package.json        # Workspaces config
```
