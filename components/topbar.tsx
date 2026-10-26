import Link from "next/link";
import { roleLabel } from "@/lib/roles";
import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import type { User } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconCheckShield, IconLogout, IconUser } from "@/components/ui/icons";

export async function Topbar({ user }: { user: User }) {
  const theme = await getTheme();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/40 bg-surface/70 backdrop-blur-xl px-4 py-3 md:px-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] transition-all duration-300">
      <Link href="/dashboard" aria-label="Home" className="flex items-center gap-2 md:hidden">
        <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-xl text-white">
          <IconCheckShield width={19} height={19} />
        </span>
        <span className="whitespace-nowrap text-[15px] font-extrabold tracking-tight">SmartSafe AI</span>
      </Link>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <ThemeToggle theme={theme} />
        <span className="hidden h-8 w-[1px] bg-border/50 md:block" />
        <Link href="/settings/profile" className="group flex items-center gap-3 rounded-full border border-transparent px-2 py-1.5 transition-all duration-300 hover:bg-surface-muted/80 hover:border-border/60 hover:shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-surface-muted to-background text-foreground/70 shadow-inner group-hover:text-brand transition-colors">
            <IconUser width={18} height={18} />
          </span>
          <div className="text-right pr-2 hidden sm:block">
            <p className="text-[13px] font-bold text-foreground/90 group-hover:text-brand transition-colors">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[10px] font-semibold tracking-wide text-foreground/50 uppercase">{roleLabel(user)}</p>
          </div>
        </Link>
        {/* On phones, log out lives on the More page. */}
        <form action={logout} className="hidden md:block">
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-surface/50 text-foreground/60 transition-all hover:bg-status-critical/10 hover:border-status-critical/30 hover:text-status-critical hover:shadow-sm"
          >
            <IconLogout width={16} height={16} />
          </button>
        </form>
      </div>
    </header>
  );
}
