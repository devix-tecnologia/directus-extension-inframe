# Contributing to Directus Extension inFrame

Thank you for your interest in contributing! This guide will help you set up your development environment and understand
our workflow.

## � How it Works

### **Architecture Overview**

This is a Directus "bundle" extension that combines a **frontend module** (user interface) + **backend hook** (automatic
configuration).

---

### **🎯 Complete Flow: From Registration to Display**

#### **1. Initial Setup (Backend Hook)**

- **File**: [src/hooks/inframe-setup/index.ts](src/hooks/inframe-setup/index.ts)
- **When it runs**: Automatically when Directus starts (`server.start`, `routes.after`)
- **What it does**: Creates 3 collections automatically if they don't exist:
  - `inframe` - stores items (URLs, icons, status)
  - `languages` - available languages
  - `inframe_translations` - title translations
- Uses [schema.json](schema.json) file as template
- Creates all necessary fields, relations, and configurations

#### **2. Registering an Item**

- User accesses the `inframe` collection in Directus
- Fills in:
  - **URL**: link to external site/dashboard
  - **Status**: published/draft/archived
  - **Icon**: Material Design icon
  - **Thumbnail**: preview image (optional)
  - **Translations**: titles in different languages

#### **3. Listing (Home Screen)**

- **Component**: [src/List.vue](src/List.vue)
- **How it fetches**: `useFetchItems()` makes GET `/items/inframe`
  - Filters only `status: published`
  - Orders by `sort` field
  - Fetches translations and prioritizes user's language
- **Renders**: Grid of cards with:
  - Thumbnail as background
  - Translated title
  - Click on card → navigates to `/inframe/{id}`

#### **4. Navigation and Side Menu**

- **Component**: [src/components/NavMenu.vue](src/components/NavMenu.vue)
- Side menu always visible with all items
- Each item has icon + translated title
- Links routed to `/inframe/{id}`

#### **5. iframe Display**

- **Route**: `/inframe/:id`
- **Route component**: [src/ItemDetailRoute.vue](src/ItemDetailRoute.vue)
  - Fetches specific item via `useFetchItem(id)`
  - Passes data to view component
- **View component**: [src/components/ItemDetail.vue](src/components/ItemDetail.vue)
  - Renders `<iframe>` with item's URL
  - Normalizes URL (adds `https://` if needed)
  - Configures iframe sandbox and permissions
  - **IMPORTANT**: iframe takes up 100% of available area, displaying external content

#### **6. Navigation Persistence**

- **Utility**: [src/utils/useNavigationPersistence.ts](src/utils/useNavigationPersistence.ts)
- Automatically saves last visited route
- When reopening the module, returns to last viewed item

---

### **🔑 Key Points**

1. **Zero manual configuration**: Hook creates everything automatically
2. **Automatic translation**: Detects user's language and shows correct title
3. **Grid → Detail**: User chooses from grid, clicks and goes to iframe
4. **Fullscreen iframe**: Takes up entire Directus usable area
5. **Security**: Sandbox configured in iframe to limit permissions

---

### **📝 Practical Example**

1. User registers: `url: "app.powerbi.com/dashboards/123"`, `title: "Sales 2024"`
2. Item appears in grid with thumbnail
3. Clicks card → goes to `/inframe/abc123`
4. `ItemDetail.vue` renders iframe pointing to Power BI
5. Power BI dashboard appears inside Directus panel

## �🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker and Docker Compose (for testing)
- Git

### Getting Started

1. **Fork and clone the repository:**

```bash
git clone https://github.com/YOUR_USERNAME/directus-extension-inframe.git
cd directus-extension-inframe
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Build the extension:**

```bash
pnpm build
```

## 🧪 Testing

This extension includes automated tests that verify compatibility with different versions of Directus.

### Test Structure

```
tests/
├── index.spec.ts          # Main integration tests
├── setup-hook.spec.ts     # Auto-setup system tests
├── setup.ts               # Test environment configuration
├── helper_test.ts         # Helper functions
├── test-env.ts            # Environment variables
├── test-logger.ts         # Logging system
└── directus-versions.js   # Tested versions
```

### Running Tests

```bash
# Run all tests
pnpm test

# Test with a specific Directus version
DIRECTUS_TEST_VERSION=11.13.1 pnpm test

# Check formatting and types
pnpm lint
pnpm typecheck
```

### Clean Test Containers

```bash
# Remove all test containers
docker rm -f $(docker ps -aq --filter "name=directus-inframe") 2>/dev/null
docker network prune -f
```

### Tested Directus Versions

Tests run on the following versions:

- **Directus 9.x**: 9.22.4, 9.23.1, 9.24.0
- **Directus 10.x**: 10.8.3
- **Directus 11.x**: 11.13.1 and newer

**Note:** Directus 11.10.1 has known issues and is blocked in tests.

### Test Architecture

Tests use:

- ✅ **Docker Compose** for isolated environment
- ✅ **Vitest** for test execution
- ✅ **SQLite** for test database
- ✅ **Docker exec** for HTTP communication (no port mapping)
- ✅ **Parallel tests** with `maxConcurrency: 3`
- ✅ **Generous timeouts** (300s) for slow containers

#### Communication via Docker Exec

Tests use `docker exec` to make HTTP requests directly inside the container, eliminating the need for port mapping and
allowing safe parallel execution of multiple versions simultaneously.

## 🏗️ Project Structure

```
src/
├── index.ts              # Main module definition
├── List.vue              # Main list component
├── types.ts              # TypeScript type definitions
├── shims.d.ts            # Vue type declarations
├── components/
│   ├── ItemDetail.vue    # Item detail component
│   └── NavMenu.vue       # Navigation menu component
└── utils/
    └── useFetchItems.ts  # Composable for fetching data
```

## 📝 Code Standards

### TypeScript

- Always use strict typing
- Define interfaces for complex objects in `types.ts`
- Use Directus types when available (`@directus/types`)

### Vue 3

- **ALWAYS** use Composition API with `<script setup>`
- Use composables for reusable logic (pattern `use*`)
- Components should have PascalCase names
- Props must be typed with TypeScript interfaces

### Naming Conventions

- Component files: PascalCase (e.g., `ItemDetail.vue`)
- Composables: camelCase starting with "use" (e.g., `useFetchItems.ts`)
- Variables and functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with optional "I" prefix

### Vue Component Structure

```vue
<template>
  <!-- HTML template -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits definitions
// Composables usage
// Reactive data
// Computed properties
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Component-specific styles */
</style>
```

## 🔄 Development Workflow

### Available Scripts

```bash
pnpm build       # Build for production
pnpm dev         # Build in development mode with watch
pnpm lint        # Check code with ESLint
pnpm lint:fix    # Auto-fix ESLint issues
pnpm format      # Format code with Prettier
pnpm format:check # Check formatting
pnpm typecheck   # TypeScript type checking
pnpm test        # Run tests
```

### Local Development with Directus

1. **Start a local Directus instance:**

```bash
docker compose up -d
```

2. **Configure CSP to allow iframes:**

The provided `docker-compose.yml` is configured to allow iframes from any domain (for development):

```yaml
CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC: '*'
```

> [!WARNING] In production, configure CSP to allow only trusted domains.

3. **Build the extension in watch mode:**

```bash
pnpm dev
```

4. **The extension will be automatically reloaded** when you make changes.

## 🔄 CI/CD & Automated Updates

### Dependency Management with Renovate

This project uses **Renovate** for automated dependency updates with age filtering:

- 📦 **npm packages**: Checked weekly on Mondays at 6 AM (São Paulo timezone)
- 🕐 **Age filtering**: Packages must be at least **5 days old** before being adopted
- 🎯 **Auto-grouping**: Minor and patch updates are grouped together
- 🔒 **Security patches**: Applied immediately (0 days)

**Age filtering by dependency type:**

- Production dependencies: 5 days minimum
- Dev dependencies: 3 days minimum
- Major updates: 7 days minimum
- Directus packages: 5 days minimum
- Security patches: 0 days (immediate)

> To enable Renovate: Install the [Renovate GitHub App](https://github.com/apps/renovate) on your repository.
> Configuration is already in `renovate.json`.

### Directus Version Testing Strategy

The project automatically tests against multiple Directus versions to ensure compatibility. To prevent issues with newly
released versions, we implement a **version age filter**:

- **Default**: New Directus versions are only adopted after **5 days** from their release date
- **Configurable**: Adjust via GitHub repository variable `DIRECTUS_VERSION_MIN_AGE_DAYS`

#### Why Age Filtering Matters

- ✅ **Stability**: Avoids immediate adoption of versions with potential critical bugs
- ✅ **Safety**: Gives time for the community to identify breaking changes
- ✅ **Reliability**: Ensures patches and hotfixes are released before we test against them

### Configuration

#### 1. PAT Token (Recommended - Enables Automated CI)

**Status**: Optional, but highly recommended for full automation.

**Without PAT_TOKEN**: PRs will be created automatically, but CI tests won't run (you'll need to manually verify).

**With PAT_TOKEN**: PRs will be created AND tests will run automatically before merge.

To enable automated CI tests on version update PRs:

1. Go to **GitHub.com** → Your profile **Settings** → **Developer settings** → **Personal access tokens** → **Tokens
   (classic)**
2. Click **Generate new token** with permissions:
   - ✓ `repo` (all)
   - ✓ `workflow`
3. Copy the token and add it to your repository:
   - Repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `PAT_TOKEN`
   - Value: paste your token

> **Why?** GitHub's security prevents `GITHUB_TOKEN` from triggering workflows to avoid infinite loops. A PAT bypasses
> this limitation.

#### 2. Version Age Filter (Optional)

To customize the minimum age for Directus versions:

1. Go to repository **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
2. Click **New repository variable**:
   - Name: `DIRECTUS_VERSION_MIN_AGE_DAYS`
   - Value: `5` (or any number of days you prefer)

**Recommended values:**

- Conservative: `14` days
- Balanced: `5` days (default)
- Aggressive: `3` days

## 📋 Pull Request Process

1. **Create a feature branch:**

```bash
git checkout -b feature/amazing-feature
```

2. **Make your changes** following our code standards

3. **Run tests and linting:**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

4. **Commit your changes** using semantic commits:

```bash
git commit -m "feat: add amazing feature"
```

See [Semantic Commits](#semantic-commits) below.

5. **Push to your fork:**

```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request** with a clear description of the changes

## 📝 Semantic Commits

Use semantic commits with messages in **English**. Follow the
[Conventional Commits](https://www.conventionalcommits.org/) standard:

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or fixing tests
- **chore**: Changes to build tools, dependencies, etc.
- **ci**: Changes to CI/CD files

### Examples

```bash
feat: add advanced filter component
fix: correct iframe rendering on mobile devices
docs: update README with installation instructions
style: apply prettier formatting to components
refactor: reorganize utils folder structure
perf: optimize API data loading
test: add unit tests for NavMenu
chore: update project dependencies
ci: configure automatic deploy workflow
```

### Breaking Changes

For breaking changes, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```bash
feat!: remove support for Directus v9
feat: add new API

BREAKING CHANGE: the new API is not compatible with previous versions
```

## 🐛 Reporting Issues

When reporting issues, please include:

- Directus version
- Extension version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser/environment details

## 💡 Suggesting Features

We love feature suggestions! Please:

1. Check if the feature already exists
2. Check if it's already been suggested in Issues
3. Open a new issue with the "enhancement" label
4. Clearly describe the use case and benefits

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Questions?

Feel free to open an issue or contact us:

- **Sidarta Veloso** - [GitHub](https://github.com/sidartaveloso) |
  [LinkedIn](https://www.linkedin.com/in/sidartaveloso)
- **Fernando Gatti** - [GitHub](https://github.com/gattifernando) |
  [LinkedIn](https://www.linkedin.com/in/gattifernando/)

---

Thank you for contributing! 🎉
