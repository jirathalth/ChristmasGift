import { expect, test } from "@playwright/test";
import { cleanupTestOrganizer, createTestIdentity, disconnectTestDatabase, inspectTestOrganizer, verifySafeE2EDatabase } from "./support/database";
import { expectNoAccessibilityViolations } from "./support/accessibility";

test.describe.configure({ mode: "serial" });

const identity = createTestIdentity();
const participantNames = ["ผู้จัด E2E", "อลิซ E2E", "บ๊อบ E2E", "แครอล E2E", "เดฟ E2E", "อีฟ E2E", "แฟรงก์ E2E"];
let databaseReady = false;

test.beforeAll(async () => { await verifySafeE2EDatabase(); databaseReady = true; });
test.afterAll(async () => { if (databaseReady) await cleanupTestOrganizer(identity.email); await disconnectTestDatabase(); });

test("complete organizer, draw, participant, privacy, and cleanup-safe journey", async ({ browser, page }) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.name));

  await page.goto("/signup");
  await page.getByLabel("ชื่อผู้จัด").fill("ผู้จัดทดสอบ E2E");
  await page.getByLabel("อีเมล").fill(identity.email);
  await page.getByLabel("รหัสผ่าน").fill(identity.password);
  const signupResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/auth/sign-up/email") && response.request().method() === "POST");
  await page.getByRole("button", { name: "สร้างบัญชี" }).click();
  expect((await signupResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("อีเมล").fill(identity.email);
  await page.getByLabel("รหัสผ่าน").fill(identity.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByLabel("ชื่อกิจกรรม").fill("ChristmasGift E2E");
  await page.getByLabel("รายละเอียด").fill("กิจกรรมทดสอบที่จะถูกล้างอัตโนมัติ");
  await page.getByRole("button", { name: "สร้างกิจกรรม" }).click();
  await expect(page).toHaveURL(/\/dashboard\/rooms\/[0-9a-f-]+$/);
  const roomId = page.url().split("/").at(-1)!;

  for (const name of participantNames) {
    await page.getByLabel("ชื่อผู้เข้าร่วม").fill(name);
    await page.getByRole("button", { name: "เพิ่มรายชื่อ" }).click();
    await expect(page.getByRole("listitem").getByText(name, { exact: true })).toBeVisible();
  }

  for (const [first, second] of [[participantNames[1], participantNames[2]], [participantNames[3], participantNames[4]]]) {
    await page.getByLabel("ผู้เข้าร่วมคนแรก").selectOption({ label: first });
    await page.getByLabel("ผู้เข้าร่วมคนที่สอง").selectOption({ label: second });
    await page.getByRole("button", { name: "เพิ่ม", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^ลบคู่ (${first} และ ${second}|${second} และ ${first})$`) })).toBeVisible();
  }

  await page.getByRole("button", { name: "ตรวจสอบความพร้อม" }).click();
  await expect(page.getByText("พร้อมจับฉลาก", { exact: true })).toBeVisible();

  const invitationResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/rooms/${roomId}/invitations`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "สร้างลิงก์เชิญ" }).click();
  const invitationResponse = await invitationResponsePromise;
  expect(invitationResponse.status()).toBe(200);
  const invitationPayload = await invitationResponse.json() as { success: boolean; data: Array<{ displayName: string; link: string }> };
  expect(invitationPayload.success).toBe(true);
  expect(invitationPayload.data).toHaveLength(7);
  expect(new Set(invitationPayload.data.map((invitation) => invitation.link)).size).toBe(7);

  const selectedInvitation = invitationPayload.data.find((invitation) => invitation.displayName === participantNames[1])!;
  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  const participantErrors: string[] = [];
  participantPage.on("console", (message) => { if (message.type() === "error") participantErrors.push(message.text()); });
  participantPage.on("pageerror", (error) => participantErrors.push(error.name));
  await participantPage.goto(selectedInvitation.link);
  await expect(participantPage.getByText("รอผู้จัดเริ่มจับฉลาก")).toBeVisible();
  expect(participantPage.url()).not.toContain("#token=");

  page.once("dialog", (dialog) => dialog.accept());
  const drawResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/rooms/${roomId}/draw`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "ยืนยันเริ่มจับฉลาก" }).click();
  expect((await drawResponsePromise).status()).toBe(200);

  const repeatedDraw = await page.request.post(`/api/rooms/${roomId}/draw`, { headers: { origin: "http://localhost:3000" } });
  expect(repeatedDraw.status()).toBe(409);
  await participantPage.reload();
  await expect(participantPage.getByRole("button", { name: "เปิดของขวัญ" })).toBeVisible();
  await participantPage.getByRole("button", { name: "เปิดของขวัญ" }).click();
  const resultCard = participantPage.locator('[role="status"]').filter({ hasText: "คุณเตรียมของขวัญให้" });
  await expect(resultCard).toBeVisible();
  const recipientName = (await resultCard.locator("p").nth(1).textContent())?.trim();
  expect(recipientName).toBeTruthy();
  expect(recipientName).not.toBe(participantNames[1]);
  await participantPage.reload();
  await expect(participantPage.getByText(recipientName!, { exact: true })).toBeVisible();

  const unauthorizedOrganizerRequest = await participantPage.request.get(`/api/rooms/${roomId}`);
  expect(unauthorizedOrganizerRequest.status()).toBe(401);
  const crossOriginMutation = await page.request.post(`/api/rooms/${roomId}/validate-draw`, { headers: { origin: "https://attacker.example" } });
  expect(crossOriginMutation.status()).toBe(403);

  await page.reload();
  await expect(page.getByText("ดูผลแล้ว", { exact: true }).first()).toBeVisible();
  const [roomResponse, statusResponse] = await Promise.all([page.request.get(`/api/rooms/${roomId}`), page.request.get(`/api/rooms/${roomId}/status`)]);
  expect(roomResponse.headers()["cache-control"]).toContain("private");
  expect(statusResponse.headers()["cache-control"]).toContain("private");
  for (const response of [roomResponse, statusResponse]) {
    const body = JSON.stringify(await response.json());
    expect(body).not.toMatch(/assignments|giverId|receiverId|recipientName/);
  }

  const databaseState = await inspectTestOrganizer(identity.email);
  expect(databaseState?.assignments).toHaveLength(7);
  expect(databaseState?.participants.every((participant) => participant.invitationTokenHash?.length === 64)).toBe(true);
  expect(databaseState?.participants.some((participant) => selectedInvitation.link.includes(participant.invitationTokenHash ?? "impossible"))).toBe(false);
  await expectNoAccessibilityViolations(page);
  expect(consoleErrors).toEqual([]);
  expect(participantErrors).toEqual([]);

  await participantContext.close();

  const invalidContext = await browser.newContext();
  const invalidPage = await invalidContext.newPage();
  await invalidPage.goto(`/invite#token=${"x".repeat(43)}`);
  await expect(invalidPage.getByText("ลิงก์ถูกยกเลิกหรือไม่ถูกต้อง")).toBeVisible();
  await invalidContext.close();
});
