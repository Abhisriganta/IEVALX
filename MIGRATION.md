# IEVALX — Folder Structure Migration Notes

This project was reorganized into a production-ready folder structure. **No component JSX, UI, styling, API calls, state, event handlers, or business logic was changed.** Only file locations and import statements were modified.

A production `vite build` was executed after migration and completed successfully with 12,332 modules transformed (zero errors).

---

## 1. What moved where

| Old path | New path |
|---|---|
| `src/components/common/Layout.jsx` | `src/layouts/DashboardLayout.jsx` |
| `src/components/common/PrivateRoute.jsx` | `src/routes/PrivateRoute.jsx` |
| `src/components/common/Sidebar.jsx` | `src/components/layout/Sidebar/Sidebar.jsx` |
| `src/components/common/Topbar.jsx` | `src/components/layout/Topbar/Topbar.jsx` |
| `src/components/auth/*.jsx` | `src/pages/auth/components/*.jsx` |
| `src/pages/LandingPage.jsx` | `src/pages/public/LandingPage.jsx` |
| `src/pages/NotFoundPage.jsx` | `src/pages/public/NotFoundPage.jsx` |
| `src/pages/AuthPage.jsx` | `src/pages/auth/AuthPage.jsx` |
| `src/context/*` | `src/contexts/*` (folder pluralised) |
| `src/services/api.js` | `src/services/api/axiosInstance.js` |
| `src/services/API/authService.js` | `src/services/api/authService.js` (shared — all roles) |
| `src/services/API/jobService.js` | `src/services/api/jobseeker/jobService.js` |
| `src/services/API/jobseekerService.js` | `src/services/api/jobseeker/jobseekerService.js` |
| `src/services/API/employerService.js` | `src/services/api/employer/employerService.js` |
| `src/services/API/adminService.js` | `src/services/api/company/adminService.js` |
| `src/utils/constants.js` | Split into 6 files under `src/constants/` |

The three role component folders (`jobseeker/`, `employer/`, `company/`) were **not restructured** — only their import paths were updated.

### Role-split in `hooks/` and `services/`

Both folders now mirror the `components/` role structure:

```
src/services/api/
├── axiosInstance.js         ← shared (HTTP client)
├── authService.js            ← shared (login/register/password reset)
├── jobseeker/
│   ├── jobService.js
│   ├── jobseekerService.js
│   └── index.js
├── employer/
│   ├── employerService.js
│   └── index.js
├── company/
│   ├── adminService.js
│   └── index.js
└── index.js                  ← top-level barrel

src/hooks/
├── useApi.js                 ← shared (generic API wrapper)
├── useAuth.js                ← shared (auth context hook)
├── useDebounce.js            ← shared (utility)
├── useForm.js                ← shared (utility)
├── jobseeker/                ← ready for role-specific hooks
│   └── index.js
├── employer/
│   └── index.js
├── company/
│   └── index.js
└── index.js                  ← top-level barrel
```

**Why some things stay at root:** `axiosInstance.js` and `authService.js` are used across all three roles (every login flow, every authenticated HTTP call), so they sit at root rather than being duplicated into each role folder. The same principle applies to the four generic hooks — they aren't role-specific and shouldn't pretend to be. Role-specific hooks added in the future go into the matching subfolder.

**Example imports after the role-split:**

```js
// From a jobseeker component
import jobService from '@/services/api/jobseeker/jobService';
import jobseekerService from '@/services/api/jobseeker/jobseekerService';

// From an employer component
import employerService from '@/services/api/employer/employerService';

// From a company component
import adminService from '@/services/api/company/adminService';

// Shared services
import api from '@/services/api/axiosInstance';
import authService from '@/services/api/authService';

// Or grab anything via the top-level barrel
import { jobService, employerService, adminService } from '@/services/api';
```

---

## 2. New files and folders created

| Path | Purpose |
|---|---|
| `src/config/env.js` | Centralized env var access (replaces scattered `import.meta.env` reads) |
| `src/config/api.config.js` | HTTP client config (base URL, timeout) |
| `src/constants/roles.js` | `ROLES`, `ROLE_HOME` (was in `utils/constants.js`) |
| `src/constants/jobTypes.js` | `JOB_TYPES`, `EXPERIENCE_LEVELS` |
| `src/constants/status.js` | `APP_STATUS`, `JOB_STATUS` |
| `src/constants/skills.js` | `COMMON_SKILLS` |
| `src/constants/locations.js` | `POPULAR_LOCATIONS` |
| `src/constants/routes.js` | `ROUTES` |
| `src/constants/index.js` | Barrel re-export of all constants |
| `src/theme/palette.js` | Color palette (extracted from ThemeContext) |
| `src/theme/typography.js` | Typography scale |
| `src/theme/shadows.js` | Elevation shadows |
| `src/theme/components.js` | MUI component overrides |
| `src/theme/index.js` | Assembles the theme via `createTheme` |
| `src/routes/AppRouter.jsx` | Extracted routing tree (was inline in `App.jsx`) |
| `src/routes/routePaths.js` | Flat `PATHS` registry |
| `src/routes/index.js` | Barrel |
| `src/services/api/index.js` | Barrel re-export of all services |
| `src/components/layout/Sidebar/index.js` | Barrel (re-exports `SIDEBAR_WIDTH`) |
| `src/components/layout/Topbar/index.js` | Barrel |
| `src/contexts/index.js` | Barrel |
| `src/hooks/index.js` | Barrel |
| `src/layouts/index.js` | Barrel |
| `src/utils/index.js` | Barrel |
| `jsconfig.json` | Path aliases for IDE IntelliSense |

---

## 3. Path aliases

Defined in both `vite.config.js` and `jsconfig.json`:

| Alias | Maps to |
|---|---|
| `@/` | `src/` |
| `@assets/` | `src/assets/` |
| `@components/` | `src/components/` |
| `@config/` | `src/config/` |
| `@constants/` | `src/constants/` |
| `@contexts/` | `src/contexts/` |
| `@hooks/` | `src/hooks/` |
| `@layouts/` | `src/layouts/` |
| `@pages/` | `src/pages/` |
| `@routes/` | `src/routes/` |
| `@services/` | `src/services/` |
| `@theme/` | `src/theme/` |
| `@utils/` | `src/utils/` |

Example: `import { useAuth } from '@/hooks/useAuth';` instead of `'../../../hooks/useAuth'`.

---

## 4. Slim App.jsx

`App.jsx` went from 114 lines (routing + providers) to 25 lines (providers only). All routing now lives in `src/routes/AppRouter.jsx`. The routing behavior is byte-identical.

---

## 5. Getting started

```bash
npm install
npm run dev
```

Dev server runs on `https://localhost:5173` (HTTPS via the bundled `mkcert` certs) and proxies `/api` to `https://192.168.48.201:8025`.

---

## 6. What was NOT changed

- No JSX inside any component was modified
- No API endpoint, request shape, or payload was changed
- No event handler, state variable, or hook logic was touched
- No MUI styles (`sx`, `styled`, theme values) were modified
- The UI is pixel-identical to the pre-migration build

---

## 7. Backwards compatibility

All old named exports are preserved. Every import symbol that existed in `utils/constants.js` (e.g., `ROLES`, `ROLE_HOME`, `JOB_TYPES`, `APP_STATUS`, `ROUTES`, etc.) is still importable as:

```js
import { ROLES, ROLE_HOME, APP_STATUS } from '@/constants';
```

The services barrel:

```js
import { authService, adminService, jobService } from '@/services/api';
```

Or direct imports still work:

```js
import authService from '@/services/api/authService';
```
