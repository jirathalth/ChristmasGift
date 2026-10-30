import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { participantSession: { findUnique } } }));

import { requireParticipant } from "@/lib/participant/session";

describe("participant session authorization", () => {
  beforeEach(() => findUnique.mockReset());

  it("rejects missing and expired sessions", async () => {
    await expect(requireParticipant(new Request("https://example.com/api/me/event"))).rejects.toEqual(expect.objectContaining({ status: 401, code: "PARTICIPANT_UNAUTHORIZED" }));
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1), revokedAt: null, participant: { room: { status: "DRAWN" } } });
    await expect(requireParticipant(new Request("https://example.com/api/me/event", { headers: { cookie: "secret_santa_participant=expired-token" } }))).rejects.toEqual(expect.objectContaining({ status: 401, code: "PARTICIPANT_SESSION_EXPIRED" }));
  });

  it("queries only a token hash and denies archived rooms", async () => {
    findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000), revokedAt: null, participant: { room: { status: "ARCHIVED" } } });
    await expect(requireParticipant(new Request("https://example.com/api/me/event", { headers: { cookie: "secret_santa_participant=raw-session-token" } }))).rejects.toEqual(expect.objectContaining({ status: 410, code: "ROOM_ARCHIVED" }));
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) } }));
    expect(findUnique.mock.calls[0][0].where.tokenHash).not.toContain("raw-session-token");
  });
});
