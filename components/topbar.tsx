import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import type { User } from "@/lib/types";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconLogout, IconUser } from "@/components/ui/icons";

const ROLE_LABELS: Record<User["role"], string> = {
  ADMIN: "Admin",
  SAFETY_DIRECTOR: "Safety Director",
  SAFETY_MANAGER: "Safety Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  CLIENT_VIEWER: "Client Viewer",
};

export async function Topbar({ user, pendingReviews = 0 }: { user: User; pendingReviews?: number }) {
  const theme = await getTheme();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
      <MobileNav role={user.role} pendingReviews={pendingReviews} />
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle theme={theme} />
        <span className="h-6 w-px bg-border" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-foreground/60">
          <IconUser width={16} height={16} />
        </span>
        <div className="text-right">
          <p className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-foreground/50">{ROLE_LABELS[user.role]}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/60 hover:bg-surface-muted"
          >
            <IconLogout width={15} height={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
