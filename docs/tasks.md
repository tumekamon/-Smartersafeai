# Tasks (corrective actions): contract for the supervisor / safety manager side

A task is a `CorrectiveAction` (`lib/types.ts`). Lifecycle:

```
open ──(assignee: photo + note)──▶ completed ──(L3+: approve)──▶ verified ──(L1/L2: close)──▶ closed
  ▲                                    │
  └────────(L3+: send back + reason)───┘
```

## Where tasks come from (`source`)

| `source` | Worker sees | Created by |
|---|---|---|
| `finding` | Hazard fix | Approving a finding in Review (AI inspection finding or a worker's hazard report) |
| `infraction` | Equipment check | A failed item on a pre-use equipment checklist |
| `manual` | Assigned job | "Assign a fix" (`/corrective-actions/new`) |

## New fields

| Field | Set by |
|---|---|
| `assignedById` | `createCorrectiveActionAction` and the finding review: the person who gave the task out |
| `proof` | `"required"` / `"optional"` / `"disabled"` (same type as checklist evidence). **Not set yet by any screen**: your "Assign a fix" form can add a "Photo required / Optional / Not needed" choice. Missing = default from `photoProof()` in `lib/tasks.ts`: required for `finding` and `infraction`, optional for `manual`. |
| `completionPhoto`, `completionNote`, `completedById` | `completeTask` (lib/task-complete.ts). A photo when `proof` is required; otherwise a note is required if no photo is sent |
| `sentBack: { note, byId, at }` | `sendBackTaskAction`; cleared when the task is completed again |

## Actions (`lib/actions/corrective-actions.ts`)

- Marking fixed: `completeTask(user, formData)` in `lib/task-complete.ts` (`correctiveActionId`, `photo?` JPEG, `note?`).
  The worker's form posts it through the phone's outbox to `POST /api/outbox/task`, so it also works with no
  signal (see docs/worker-module.md). The assignee, or an L3+ user on their behalf. Proof rules follow `photoProof(task)`.
  **Marking done without proof is no longer possible**: `updateCorrectiveActionStatusAction` only does
  `completed → verified` and `verified → closed`.
- `sendBackTaskAction(state, formData)`: `correctiveActionId`, `note` (required). L3+, only on `completed`.
- Access: `visibleTask(user, id)` in `lib/task-access.ts`. The task must be on the user's sites, and a
  worker only sees their own.

The task page `/corrective-actions/<id>` already has Approve / Send back / Close out for L1–L3,
so a review queue can simply link there.
