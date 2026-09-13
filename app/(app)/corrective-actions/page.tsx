import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, getUser, listCorrectiveActions } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { CorrectiveActionRow } from "@/components/corrective-action-row";

const STATUS_ORDER = { open: 0, completed: 1, verified: 2, closed: 3 };

export default async function CorrectiveActionsPage() {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);
  const isWorker = user.role === "WORKER";

  const all = listCorrectiveActions();
  const actions = [...(isWorker ? all.filter((a) => a.assignedToId === user.id) : all)].sort(
    (a, b) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.dueDate < b.dueDate ? -1 : 1;
    }
  );

  const openCount = actions.filter((a) => a.status === "open").length;
  const overdueCount = actions.filter(
    (a) => (a.status === "open" || a.status === "completed") && new Date(a.dueDate) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {isWorker ? "My Tasks" : "Corrective Action Tracker"}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {isWorker
            ? "Corrective actions assigned to you. Marking one “completed” still requires a safety professional to verify it."
            : capabilities.isReadOnly
              ? "Read-only view of every corrective action across all projects."
              : "Every open safety finding across all projects — infractions, inspection findings, and manual entries all land here so nothing sits open and forgotten."}
        </p>
      </div>

      <Card>
        <CardHeader title={`${actions.length} total · ${openCount} open · ${overdueCount} overdue`} />
        {actions.length === 0 ? (
          <p className="text-sm text-foreground/50">Nothing here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-foreground/50">
                  <th className="py-2 pr-3">Finding / Action</th>
                  <th className="py-2 pr-3">Assigned to</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Status</th>
                  {!capabilities.isReadOnly && <th className="py-2 text-right">Next step</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <CorrectiveActionRow
                    key={action.id}
                    action={action}
                    project={getProject(action.projectId)}
                    assignee={getUser(action.assignedToId)}
                    currentUserId={user.id}
                    capabilities={capabilities}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
