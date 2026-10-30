import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "./support/accessibility";

for (const path of ["/", "/login", "/signup"] as const) {
  test(`${path} has no automated WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoAccessibilityViolations(page);
  });
}

test("authentication forms support keyboard navigation and visible focus", async ({ page }) => {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("href", "/");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("ชื่อผู้จัด")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("อีเมล")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("รหัสผ่าน")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "สร้างบัญชี" })).toBeFocused();
});
