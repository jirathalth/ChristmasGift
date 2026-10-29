import { fail, privateOk } from "@/lib/api";
import { getParticipantEvent } from "@/lib/participant/service";

export async function GET(request: Request) { try { return privateOk(await getParticipantEvent(request)); } catch (error) { return fail(error); } }
