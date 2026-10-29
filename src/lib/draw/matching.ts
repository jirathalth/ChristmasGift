import { randomInt } from "node:crypto";
import type { ExcludedPairInput } from "@/lib/rooms/feasibility";

export type DrawAssignment = { giverId: string; receiverId: string };
type RandomIndex = (maxExclusive: number) => number;

function shuffle<T>(values: readonly T[], randomIndex: RandomIndex) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const target = randomIndex(index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createRandomMatching(participantIds: readonly string[], excludedPairs: readonly ExcludedPairInput[], randomIndex: RandomIndex = randomInt): DrawAssignment[] | null {
  if (participantIds.length < 2 || new Set(participantIds).size !== participantIds.length) return null;
  const participantSet = new Set(participantIds);
  const excluded = new Map(participantIds.map((id) => [id, new Set<string>()]));
  for (const pair of excludedPairs) {
    if (!participantSet.has(pair.participantAId) || !participantSet.has(pair.participantBId)) return null;
    excluded.get(pair.participantAId)?.add(pair.participantBId);
    excluded.get(pair.participantBId)?.add(pair.participantAId);
  }

  const candidates = new Map(participantIds.map((giverId) => [giverId, shuffle(participantIds.filter((receiverId) => receiverId !== giverId && !excluded.get(giverId)?.has(receiverId)), randomIndex)]));
  if ([...candidates.values()].some((receivers) => receivers.length === 0)) return null;
  const receiverToGiver = new Map<string, string>();
  const giverOrder = shuffle(participantIds, randomIndex).sort((left, right) => (candidates.get(left)?.length ?? 0) - (candidates.get(right)?.length ?? 0));

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

  for (const giverId of giverOrder) if (!assign(giverId, new Set())) return null;
  const giverToReceiver = new Map([...receiverToGiver].map(([receiverId, giverId]) => [giverId, receiverId]));
  const assignments = participantIds.map((giverId) => ({ giverId, receiverId: giverToReceiver.get(giverId) ?? "" }));
  return validateMatching(participantIds, excludedPairs, assignments) ? assignments : null;
}

export function validateMatching(participantIds: readonly string[], excludedPairs: readonly ExcludedPairInput[], assignments: readonly DrawAssignment[]) {
  if (assignments.length !== participantIds.length) return false;
  const participantSet = new Set(participantIds);
  const givers = new Set(assignments.map((assignment) => assignment.giverId));
  const receivers = new Set(assignments.map((assignment) => assignment.receiverId));
  if (givers.size !== participantIds.length || receivers.size !== participantIds.length) return false;
  const excluded = new Set(excludedPairs.flatMap((pair) => [`${pair.participantAId}|${pair.participantBId}`, `${pair.participantBId}|${pair.participantAId}`]));
  return assignments.every((assignment) => participantSet.has(assignment.giverId) && participantSet.has(assignment.receiverId) && assignment.giverId !== assignment.receiverId && !excluded.has(`${assignment.giverId}|${assignment.receiverId}`));
}
