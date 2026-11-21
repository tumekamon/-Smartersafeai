import { IconMapPin } from "@/components/ui/icons";

/** Shown to a supervisor or worker who isn't on any site's crew yet. Deliberately names no projects. */
export function NoSiteNotice({ action = "do this" }: { action?: string }) {
  return (
    <section className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <IconMapPin width={22} height={22} />
      </span>
      <h2 className="text-lg font-bold">You&apos;re not on a site yet</h2>
      <p className="max-w-sm text-sm text-foreground/60">
        You need to be added to a site&apos;s crew before you can {action}. Ask your supervisor or safety manager to add you.
      </p>
    </section>
  );
}
