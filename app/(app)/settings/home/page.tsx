import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { DEFAULT_TILES, MAX_TILES, TILE_CATALOG } from "@/lib/dashboard-tiles";
import { layoutFor, MODULES, sectionsCatalogFor, visibleSections } from "@/lib/home-layout";
import { ROLE_INFO, ROLES } from "@/lib/roles";
import type { UserRole } from "@/lib/types";
import { resetRoleLayoutAction, saveRoleLayoutAction, setAllowPersonalTilesAction } from "@/lib/actions/home-layout";
import { IconCheck } from "@/components/ui/icons";

const ERRORS: Record<string, string> = {
  sections: "Keep at least one section on Home.",
  tiles: "Pick at least one number tile, or turn off Key numbers.",
  toomany: `Pick up to ${MAX_TILES} tiles.`,
};

/** The admin decides, per role level, what Home shows and which areas appear in the menu. */
export default async function HomeLayoutSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; saved?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) redirect("/dashboard");
  const company = getCompany(user.companyId);
  if (!company) redirect("/dashboard");

  const sp = await searchParams;
  const role: UserRole = ROLES.includes(sp.role as UserRole) ? (sp.role as UserRole) : "WORKER";
  const layout = layoutFor(company, role);
  const sections = visibleSections(company, role);
  const tiles = new Set(layout.tiles ?? DEFAULT_TILES);
  const allowPersonal = company.allowPersonalTiles !== false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-sidebar-accent">
          ← Settings
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">What each role sees</h1>
        <p className="mt-1 text-sm text-foreground/60">Pick a role, then switch parts of Home and the menu on or off.</p>
      </div>

      <nav aria-label="Role" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((r) => {
          const on = r === role;
          return (
            <Link
              key={r}
              href={`/settings/home?role=${r}`}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-16 flex-col justify-center rounded-2xl px-4 ${on ? "bg-foreground text-background" : "card hover:shadow-md"}`}
            >
              <span className="text-xs font-bold opacity-70">L{ROLE_INFO[r].level}</span>
              <span className="text-[15px] font-bold">{ROLE_INFO[r].label}</span>
            </Link>
          );
        })}
      </nav>

      {sp.saved && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-[#0a6b0a] px-4 py-3 text-sm font-semibold text-white">
          <IconCheck width={18} height={18} strokeWidth={2.4} />
          Saved. {ROLE_INFO[role].label}s see the change next time they open the app.
        </p>
      )}
      {sp.error && ERRORS[sp.error] && <p className="form-error">{ERRORS[sp.error]}</p>}

      <form action={saveRoleLayoutAction} className="space-y-6">
        <input type="hidden" name="role" value={role} />

        <section className="card space-y-3 p-5">
          <h2 className="text-base font-bold">Home sections</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sectionsCatalogFor(role).map((s) => (
              <Toggle key={s.id} name="section" value={s.id} defaultChecked={sections.has(s.id)} label={s.label} />
            ))}
          </div>
        </section>

        {role !== "WORKER" && (
          <section className="card space-y-3 p-5">
            <div>
              <h2 className="text-base font-bold">Key number tiles</h2>
              <p className="text-sm text-foreground/60">Up to {MAX_TILES}. Shown when Key numbers is on.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TILE_CATALOG.map((t) => (
                <Toggle key={t.id} name="tile" value={t.id} defaultChecked={tiles.has(t.id)} label={t.label} />
              ))}
            </div>
          </section>
        )}

        <section className="card space-y-3 p-5">
          <div>
            <h2 className="text-base font-bold">Menu areas</h2>
            {role === "ADMIN" && <p className="text-sm text-foreground/60">Admins always keep every area.</p>}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {MODULES.map((m) => (
              <Toggle
                key={m.id}
                name={`module_${m.id}`}
                defaultChecked={role === "ADMIN" || layout.modules?.[m.id] !== false}
                disabled={role === "ADMIN"}
                label={m.label}
              />
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="min-h-12 rounded-xl bg-sidebar-accent px-6 text-[15px] font-bold text-white">
            Save for {ROLE_INFO[role].label}s
          </button>
          <button
            type="submit"
            formAction={resetRoleLayoutAction}
            formNoValidate
            className="min-h-12 rounded-xl px-5 text-[15px] font-semibold text-foreground/70 ring-1 ring-border hover:bg-surface-muted"
          >
            Reset to show everything
          </button>
        </div>
      </form>

      <form action={setAllowPersonalTilesAction} className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="allow" value={(!allowPersonal).toString()} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">Let L1 and L2 pick their own tiles</h2>
          <p className="text-sm text-foreground/60">
            {allowPersonal ? "On: their own picks replace the role's tiles." : "Off: everyone sees the tiles you set here."}
          </p>
        </div>
        <button
          type="submit"
          aria-pressed={allowPersonal}
          className={`min-h-12 rounded-xl px-5 text-[15px] font-bold ${allowPersonal ? "bg-foreground text-background" : "ring-1 ring-border"}`}
        >
          {allowPersonal ? "On" : "Off"}
        </button>
      </form>
    </div>
  );
}

function Toggle({
  name,
  value,
  label,
  defaultChecked,
  disabled = false,
}: {
  name: string;
  value?: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-option ${disabled ? "opacity-60" : ""}`}>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} disabled={disabled} className="sr-only" />
      <span aria-hidden="true" className="toggle-box">
        <IconCheck width={16} height={16} strokeWidth={2.6} />
      </span>
      {label}
    </label>
  );
}
