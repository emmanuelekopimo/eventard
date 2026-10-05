import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("visitors are sent to the sign-in page with the demo login prefilled", async ({ page }) => {
  await page.goto("/my");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("#email")).toHaveValue("student@uniuyo.edu.ng");
  await expect(page.locator("#password")).toHaveValue("student123");
});

test("wrong password shows an inline error", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#password", "nope");
  await page.getByTestId("sign-in").click();
  await expect(page.locator(".form-error")).toHaveText("Email or password is incorrect");
});

test("student RSVPs, the count goes up, and the calendar link is prefilled", async ({ page }) => {
  await signIn(page, "student");
  await expect(page.getByRole("heading", { name: /Good morning, Imaobong/ })).toBeVisible();
  await page.getByTestId("featured").click();
  await expect(page.getByTestId("event-title")).toHaveText("Code and Coffee: Build a Web App with Next.js");
  const count = page.getByTestId("rsvp-count");
  await expect(count).toHaveText("37");
  await page.getByTestId("rsvp-button").click();
  await expect(count).toHaveText("38");
  await expect(page.getByTestId("rsvp-button")).toContainText("You are going");

  const href = await page.getByTestId("gcal").getAttribute("href");
  const url = new URL(href!);
  expect(url.hostname).toBe("calendar.google.com");
  expect(url.searchParams.get("action")).toBe("TEMPLATE");
  expect(url.searchParams.get("text")).toBe("Code and Coffee: Build a Web App with Next.js");
  // 14:00 to 17:00 Lagos on 6 Oct is 13:00 to 16:00 UTC
  expect(url.searchParams.get("dates")).toBe("20261006T130000Z/20261006T160000Z");
  expect(url.searchParams.get("location")).toBe("ICT Centre, Lab 2, Town Campus");

  await page.getByTestId("nav-my").click();
  await expect(page.getByRole("heading", { name: "My RSVPs" })).toBeVisible();
  await expect(page.getByText("Code and Coffee: Build a Web App with Next.js")).toBeVisible();
});

test("a full event cannot be booked", async ({ page }) => {
  await signIn(page, "student");
  await page.goto("/?q=Robotics");
  await page.getByTestId("event-card").first().click();
  await expect(page.getByText("This event is full")).toBeVisible();
  await expect(page.getByTestId("rsvp-button")).toHaveCount(0);
});

test("admin form shows inline validation errors", async ({ page }) => {
  await signIn(page, "admin");
  await page.getByTestId("new-event").click();
  await page.getByTestId("save-event").click();
  await expect(page.getByText("Title must be at least 4 characters")).toBeVisible();
  await expect(page.getByText("Pick a category")).toBeVisible();
  await expect(page.getByText("Upload a banner or pick one from the library")).toBeVisible();
});

test("admin publishes an event and it appears on a student's open board without a reload", async ({ browser }) => {
  const studentCtx = await browser.newContext();
  const student = await studentCtx.newPage();
  await signIn(student, "student");
  await expect(student.getByText("Final Year Project Clinic")).toHaveCount(0);

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await signIn(admin, "admin");
  await admin.getByTestId("new-event").click();
  await admin.fill("#title", "Final Year Project Clinic");
  await admin.selectOption("#category", "Academic");
  await admin.fill("#venue", "Faculty of Science Lecture Theatre");
  await admin.fill("#capacity", "80");
  await admin.fill("#description", "Supervisors review project proposals and answer questions about chapter one.");
  await admin.locator('label.preset[title="library"]').click();
  await admin.getByTestId("save-event").click();
  await expect(admin).toHaveURL(/\/events\/\d+\?created=1/);
  await expect(admin.getByText("Event published")).toBeVisible();

  // The student page refreshes itself every few seconds.
  await expect(student.getByText("Final Year Project Clinic")).toBeVisible({ timeout: 15_000 });
  await studentCtx.close();
  await adminCtx.close();
});
