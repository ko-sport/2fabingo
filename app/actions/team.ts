"use server";

import { readSessionUser } from "@/lib/auth";
import { createTeam, joinTeam, leaveTeam, loadTeam } from "@/lib/teams";
import type { TeamBoard } from "@/lib/team-shape";

export type TeamState = { error?: string; team?: TeamBoard | null };

export async function createTeamAction(_state: TeamState, formData: FormData): Promise<TeamState> {
  const user = await readSessionUser(String(formData.get("session") ?? ""));
  if (!user) return { error: "Log in again to start a team." };
  const result = await createTeam(user.id, String(formData.get("name") ?? ""));
  if ("error" in result) return { error: result.error };
  return { team: result };
}

export async function joinTeamAction(_state: TeamState, formData: FormData): Promise<TeamState> {
  const user = await readSessionUser(String(formData.get("session") ?? ""));
  if (!user) return { error: "Log in again to join a team." };
  const result = await joinTeam(user.id, String(formData.get("code") ?? ""));
  if ("error" in result) return { error: result.error };
  return { team: result };
}

export async function leaveTeamAction(_state: TeamState, formData: FormData): Promise<TeamState> {
  const user = await readSessionUser(String(formData.get("session") ?? ""));
  if (!user) return { error: "Log in again to leave the team." };
  await leaveTeam(user.id);
  return { team: null };
}

export async function reloadTeamAction(sessionToken: string): Promise<TeamBoard | null> {
  const user = await readSessionUser(sessionToken);
  if (!user) return null;
  return loadTeam(user.id);
}
