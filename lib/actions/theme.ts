"use server";

import { setTheme, type Theme } from "@/lib/theme";

export async function setThemeAction(theme: Theme) {
  await setTheme(theme);
}
