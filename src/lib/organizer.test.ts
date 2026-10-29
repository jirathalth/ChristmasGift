import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));

import { requireOrganizer } from "@/lib/organizer";

describe("requireOrganizer", () => {
  beforeEach(() => getSession.mockReset());

  it("returns the authenticated organizer", async () => {
    getSession.mockResolvedValue({ user: { id: "owner-a", name: "ผู้จัด" } });
    await expect(requireOrganizer(new Request("https://example.com/api/rooms"))).resolves.toMatchObject({ id: "owner-a" });
  });

  it("rejects unauthenticated requests", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireOrganizer(new Request("https://example.com/api/rooms"))).rejects.toEqual(expect.objectContaining({ status: 401, code: "UNAUTHORIZED" }));
  });
});
