import { describe, expect, it } from "vitest";
import { assertRoomEditable, assertRoomOwnership } from "@/lib/rooms/policy";

describe("room authorization policy", () => {
  it("allows the organizer who owns the room", () => {
    expect(() => assertRoomOwnership({ organizerId: "owner-a" }, "owner-a")).not.toThrow();
  });

  it("rejects another organizer", () => {
    expect(() => assertRoomOwnership({ organizerId: "owner-b" }, "owner-a")).toThrowError(expect.objectContaining({ status: 403, code: "FORBIDDEN" }));
  });

  it("returns not found for a missing room", () => {
    expect(() => assertRoomOwnership(null, "owner-a")).toThrowError(expect.objectContaining({ status: 404, code: "ROOM_NOT_FOUND" }));
  });

  it.each(["DRAWN", "COMPLETED", "ARCHIVED"] as const)("prevents editing %s rooms", (status) => {
    expect(() => assertRoomEditable(status)).toThrowError(expect.objectContaining({ status: 409, code: "ROOM_READ_ONLY" }));
  });
});
