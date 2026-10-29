import { fail, privateOk } from "@/lib/api";
import { getRevealedAssignment } from "@/lib/participant/service";

export async function GET(request: Request) { try { return privateOk(await getRevealedAssignment(request)); } catch (error) { return fail(error); } }
