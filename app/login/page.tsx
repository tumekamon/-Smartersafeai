import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listUsers } from "@/lib/db";
import { LoginForm } from "@/components/login-form";
import { IconCheckShield } from "@/components/ui/icons";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.userId) {
    redirect("/dashboard");
  }

  const teamUsers = listUsers();

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-white">
            <IconCheckShield width={19} height={19} />
          </span>
          <div>
            <p className="text-sm font-semibold">SmartSafe AI</p>
            <p className="text-xs text-foreground/50">Safety Intelligence Platform</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
          <p className="mb-5 text-sm text-foreground/60">
            BESCO Electric — UK Markey Cancer Center project team.
          </p>
          <LoginForm />
        </div>

        <details className="mt-4 rounded-lg border border-border bg-surface-muted p-3 text-xs text-foreground/60">
          <summary className="cursor-pointer font-medium text-foreground/80">
            Team accounts
          </summary>
          <ul className="mt-2 space-y-1">
            {teamUsers.map((u) => (
              <li key={u.id} className="flex justify-between gap-2">
                <span>{u.email}</span>
                <span className="text-foreground/40">{u.role.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-border pt-2 text-foreground/40">Password: demo1234</p>
        </details>
      </div>
    </div>
  );
}
