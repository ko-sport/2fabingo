"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { createTeamAction, joinTeamAction, leaveTeamAction, type TeamState } from "@/app/actions/team";
import type { TeamBoard } from "@/lib/team-shape";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: TeamState = {};

export function TeamDialog({
  sessionToken,
  team,
  onTeam,
}: {
  sessionToken: string;
  team: TeamBoard | null;
  onTeam: (team: TeamBoard | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [created, create, creating] = useActionState(async (previous: TeamState, formData: FormData) => {
    const next = await createTeamAction(previous, formData);
    if (next.team) {
      onTeam(next.team);
      setOpen(false);
    }
    return next;
  }, initial);
  const [joined, join, joining] = useActionState(async (previous: TeamState, formData: FormData) => {
    const next = await joinTeamAction(previous, formData);
    if (next.team) {
      onTeam(next.team);
      setOpen(false);
    }
    return next;
  }, initial);
  const [left, leave, leaving] = useActionState(async (previous: TeamState, formData: FormData) => {
    const next = await leaveTeamAction(previous, formData);
    if (next.team === null && !next.error) {
      onTeam(null);
      setOpen(false);
    }
    return next;
  }, initial);

  return (
    <>
      <button
        type="button"
        data-testid="team-menu"
        className="text-sm text-[#f4f7f2] underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        Team
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {team ? team.name : "A team card"}
            </DialogTitle>
            <DialogDescription>
              {team
                ? "A mark on your card is also a mark here. Leaving keeps the marks the team already has."
                : "Start a card together, or join one with its code. Your own card stays yours."}
            </DialogDescription>
          </DialogHeader>
          {team ? (
            <TeamHome team={team} sessionToken={sessionToken} state={left} pending={leaving} action={leave} />
          ) : (
            <div className="flex flex-col gap-6">
              <form action={create} className="flex flex-col gap-3">
                <input type="hidden" name="session" value={sessionToken} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="team-name">Team name</Label>
                  <Input id="team-name" name="name" required minLength={2} maxLength={24} className="h-10" />
                </div>
                {created.error ? <p className="text-sm text-destructive">{created.error}</p> : null}
                <Button type="submit" disabled={creating} className="h-10">
                  {creating ? "Creating…" : "Create team"}
                </Button>
              </form>
              <form action={join} className="flex flex-col gap-3 border-t border-border pt-4">
                <input type="hidden" name="session" value={sessionToken} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="team-code">Team code</Label>
                  <Input
                    id="team-code"
                    name="code"
                    required
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="h-10 font-mono tracking-[0.2em]"
                  />
                </div>
                {joined.error ? <p className="text-sm text-destructive">{joined.error}</p> : null}
                <Button type="submit" variant="outline" disabled={joining} className="h-10">
                  {joining ? "Joining…" : "Join team"}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamHome({
  team,
  sessionToken,
  state,
  pending,
  action,
}: {
  team: TeamBoard;
  sessionToken: string;
  state: TeamState;
  pending: boolean;
  action: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Share this code</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-mono text-2xl tracking-[0.22em]" data-testid="team-code">
            {team.joinCode}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => {
              void navigator.clipboard.writeText(team.joinCode).then(
                () => toast.success("Code copied."),
                () => toast.error("Couldn’t copy that code."),
              );
            }}
          >
            Copy
          </Button>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">On this card</p>
        <ul className="mt-2 flex flex-col gap-1" data-testid="team-members">
          {team.members.map((member) => (
            <li key={member.username} className="text-sm">
              {member.username}
              {member.you ? <span className="text-muted-foreground"> · you</span> : null}
            </li>
          ))}
        </ul>
      </div>
      <form action={action}>
        <input type="hidden" name="session" value={sessionToken} />
        {state.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" variant="outline" disabled={pending} className="h-10">
          {pending ? "Leaving…" : "Leave team"}
        </Button>
      </form>
    </div>
  );
}
