export type TeamMember = { username: string; you: boolean };

export type TeamMark = { code: number; count: number; markedAt: string };

export type TeamBoard = {
  name: string;
  joinCode: string;
  members: TeamMember[];
  marks: [number, number][];
  recent: TeamMark[];
};
