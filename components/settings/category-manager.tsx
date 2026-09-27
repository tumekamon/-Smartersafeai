"use client";

import { useRef } from "react";
import { addCategoryAction, removeCategoryAction } from "@/lib/actions/settings";
import { IconPlus, IconX } from "@/components/ui/icons";

export function CategoryManager({ categories }: { categories: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((name) => (
          <form key={name} action={removeCategoryAction}>
            <input type="hidden" name="name" value={name} />
            <button
              type="submit"
              className="group flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-critical"
            >
              {name}
              <IconX width={11} height={11} className="opacity-40 group-hover:opacity-100" />
            </button>
          </form>
        ))}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await addCategoryAction(formData);
          formRef.current?.reset();
        }}
        className="mt-3 flex max-w-xs items-center gap-2"
      >
        <input
          name="name"
          required
          placeholder="Add a category"
          className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-sidebar-accent"
        />
        <button
          type="submit"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted transition-colors hover:bg-sidebar-accent hover:text-white"
        >
          <IconPlus width={14} height={14} />
        </button>
      </form>
    </div>
  );
}
