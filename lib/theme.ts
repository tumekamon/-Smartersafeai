import "server-only";
import { cookies } from "next/headers";

export type Theme = "light" | "dark" | "system";

const COOKIE_NAME = "smartsafe_theme";

export async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value === "light" || value === "dark" ? value : "system";
}

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  if (theme === "system") {
    cookieStore.delete(COOKIE_NAME);
  } else {
    cookieStore.set(COOKIE_NAME, theme, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
}
