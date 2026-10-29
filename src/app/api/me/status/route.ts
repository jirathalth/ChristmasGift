import { fail, privateOk } from "@/lib/api";
import { getParticipantStatus } from "@/lib/participant/service";

export async function GET(request: Request) { try { return privateOk(await getParticipantStatus(request)); } catch (error) { return fail(error); } }
