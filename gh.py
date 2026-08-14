from pathlib import Path

ROOT = Path("frontend")

directories = [
    "public/images",

    "src/assets",

    "src/components/ui",
    "src/components/layout",
    "src/components/common",

    "src/features/auth/pages",
    "src/features/auth/components",
    "src/features/auth/services",

    "src/features/dashboard/pages",
    "src/features/dashboard/components",
    "src/features/dashboard/services",

    "src/features/species/pages",
    "src/features/species/components",
    "src/features/species/services",

    "src/features/sites/pages",
    "src/features/sites/components",
    "src/features/sites/services",

    "src/features/users/pages",
    "src/features/users/components",
    "src/features/users/services",

    "src/features/exports/pages",
    "src/features/exports/components",
    "src/features/exports/services",

    "src/pages",
    "src/services",
    "src/hooks",
    "src/lib",
    "src/types",
]

files = [
    # Public
    "public/favicon.svg",

    # UI components
    "src/components/ui/Button.tsx",
    "src/components/ui/Badge.tsx",
    "src/components/ui/Card.tsx",
    "src/components/ui/Input.tsx",
    "src/components/ui/Modal.tsx",

    # Layout
    "src/components/layout/AppLayout.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/layout/Header.tsx",
    "src/components/layout/MobileNav.tsx",

    # Common components
    "src/components/common/LoadingSpinner.tsx",
    "src/components/common/EmptyState.tsx",
    "src/components/common/ErrorState.tsx",
    "src/components/common/SourceBadge.tsx",

    # Auth
    "src/features/auth/pages/LoginPage.tsx",
    "src/features/auth/types.ts",

    # Dashboard
    "src/features/dashboard/pages/DashboardPage.tsx",
    "src/features/dashboard/types.ts",

    # Species
    "src/features/species/pages/SpeciesPage.tsx",
    "src/features/species/pages/SpeciesDetailPage.tsx",
    "src/features/species/pages/AddSpeciesPage.tsx",
    "src/features/species/components/SpeciesTable.tsx",
    "src/features/species/components/SpeciesSearch.tsx",
    "src/features/species/components/SpeciesReviewForm.tsx",
    "src/features/species/components/SourceBadge.tsx",
    "src/features/species/components/DuplicateSpeciesDialog.tsx",
    "src/features/species/components/ValidationHistory.tsx",
    "src/features/species/services/speciesService.ts",
    "src/features/species/types.ts",

    # Sites
    "src/features/sites/pages/SitesPage.tsx",
    "src/features/sites/types.ts",

    # Users
    "src/features/users/pages/UsersPage.tsx",
    "src/features/users/types.ts",

    # Exports
    "src/features/exports/pages/ExportsPage.tsx",
    "src/features/exports/types.ts",

    # General pages
    "src/pages/LandingPage.tsx",
    "src/pages/NotFoundPage.tsx",

    # Services
    "src/services/api.ts",
    "src/services/auth.ts",

    # Hooks
    "src/hooks/useAuth.ts",

    # Lib
    "src/lib/utils.ts",
    "src/lib/constants.ts",

    # Types
    "src/types/common.ts",

    # Main files
    "src/App.tsx",
    "src/main.tsx",
    "src/index.css",

    # Root configuration
    ".env",
    "package.json",
    "tailwind.config.ts",
    "tsconfig.json",
    "vite.config.ts",
    "README.md",
]


def create_structure():
    # Create directories
    for directory in directories:
        path = ROOT / directory
        path.mkdir(parents=True, exist_ok=True)

    # Create files
    for file in files:
        path = ROOT / file
        path.parent.mkdir(parents=True, exist_ok=True)

        if not path.exists():
            path.touch()

    print(f"Frontend structure created successfully in: {ROOT.resolve()}")
    print(f"Created {len(directories)} directories and {len(files)} files.")


if __name__ == "__main__":
    create_structure()