import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("mobile: student can browse, open an event and cancel an RSVP without sideways scrolling", async ({ page }) => {
  await signIn(page, "student");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByTestId("today-item").filter({ hasText: "Startup Pitch Night" }).click();
  await expect(page.getByTestId("event-title")).toHaveText("Startup Pitch Night");
  const count = page.getByTestId("rsvp-count");
  const before = Number(await count.textContent());
  await expect(page.getByTestId("rsvp-button")).toContainText("You are going");
  await page.getByTestId("rsvp-button").click();
  await expect(count).toHaveText(String(before - 1));
  await page.getByTestId("rsvp-button").click();
  await expect(count).toHaveText(String(before));
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow2).toBeLessThanOrEqual(0);
});
