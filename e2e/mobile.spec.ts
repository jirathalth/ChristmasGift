import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "./support/accessibility";

test("mobile reveal respects reduced motion and keeps recipient stable", async ({ page }) => {
  let revealed = false;
  const event = () => ({ participant: { displayName: "ผู้ทดสอบมือถือ" }, room: { name: "คริสต์มาสมือถือ", description: "ทดสอบ reduced motion", eventDate: null, budget: "500.00", currency: "THB", status: "DRAWN" }, revealed });
  await page.route("**/api/invitations/redeem", (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "set-cookie": "secret_santa_participant=e2e-mobile; Path=/; HttpOnly; SameSite=Lax" }, body: JSON.stringify({ success: true, data: event() }) }));
  await page.route("**/api/me/reveal", async (route) => { revealed = true; await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { recipientName: "คุณดาว" } }) }); });
  await page.route("**/api/me/event", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: event() }) }));
  await page.route("**/api/me/assignment", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { recipientName: "คุณดาว" } }) }));

  await page.goto(`/invite#token=${"a".repeat(43)}`);
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  const revealButton = page.getByRole("button", { name: "เปิดของขวัญ" });
  await revealButton.focus();
  await expect(revealButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("คุณดาว", { exact: true })).toBeVisible();
  await expectNoAccessibilityViolations(page);
  await page.reload();
  await expect(page.getByText("คุณดาว", { exact: true })).toBeVisible();
});
