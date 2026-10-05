import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page, who: "student" | "admin") {
  await page.goto("/login");
  if (who === "admin") await page.getByTestId("use-admin").click();
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(who === "admin" ? /\/admin$/ : /\/$/);
}
