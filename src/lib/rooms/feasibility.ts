export type ExcludedPairInput = { participantAId: string; participantBId: string };

export type FeasibilityResult = {
  feasible: boolean;
  code: "READY" | "TOO_FEW_PARTICIPANTS" | "TOO_MANY_PARTICIPANTS" | "NO_AVAILABLE_RECIPIENT" | "IMPOSSIBLE_MATCHING";
  message: string;
};

export function validateDrawFeasibility(participantIds: readonly string[], excludedPairs: readonly ExcludedPairInput[]): FeasibilityResult {
  if (participantIds.length < 2) return { feasible: false, code: "TOO_FEW_PARTICIPANTS", message: "ต้องมีผู้เข้าร่วมอย่างน้อย 2 คน" };
  if (participantIds.length > 100) return { feasible: false, code: "TOO_MANY_PARTICIPANTS", message: "รองรับผู้เข้าร่วมได้ไม่เกิน 100 คน" };

  const participantSet = new Set(participantIds);
  const excluded = new Map(participantIds.map((id) => [id, new Set<string>()]));
  for (const pair of excludedPairs) {
    if (!participantSet.has(pair.participantAId) || !participantSet.has(pair.participantBId)) continue;
    excluded.get(pair.participantAId)?.add(pair.participantBId);
    excluded.get(pair.participantBId)?.add(pair.participantAId);
  }

  const candidates = new Map(participantIds.map((giverId) => [
    giverId,
    participantIds.filter((receiverId) => receiverId !== giverId && !excluded.get(giverId)?.has(receiverId))
  ]));
  if ([...candidates.values()].some((receivers) => receivers.length === 0)) {
    return { feasible: false, code: "NO_AVAILABLE_RECIPIENT", message: "มีผู้เข้าร่วมอย่างน้อยหนึ่งคนที่ไม่มีผู้รับของขวัญที่เลือกได้ กรุณาลดคู่ยกเว้น" };
  }

  const receiverToGiver = new Map<string, string>();
  const giverOrder = [...participantIds].sort((left, right) => (candidates.get(left)?.length ?? 0) - (candidates.get(right)?.length ?? 0));

  function assign(giverId: string, visitedReceivers: Set<string>): boolean {
    for (const receiverId of candidates.get(giverId) ?? []) {
      if (visitedReceivers.has(receiverId)) continue;
      visitedReceivers.add(receiverId);
      const currentGiver = receiverToGiver.get(receiverId);
      if (!currentGiver || assign(currentGiver, visitedReceivers)) {
        receiverToGiver.set(receiverId, giverId);
        return true;
      }
    }
    return false;
  }

  for (const giverId of giverOrder) {
    if (!assign(giverId, new Set())) {
      return { feasible: false, code: "IMPOSSIBLE_MATCHING", message: "ไม่สามารถจัดคู่ให้ครบทุกคนได้จากคู่ยกเว้นปัจจุบัน กรุณาลดคู่ยกเว้น" };
    }
  }

  return { feasible: true, code: "READY", message: "พร้อมจับฉลาก ทุกคนมีผู้รับของขวัญที่เป็นไปได้" };
}
