export type Position = 'GS' | 'GA' | 'WA' | 'C' | 'WD' | 'GD' | 'GK';

export const POSITION_ORDER: Position[] = ['GS', 'GA', 'WA', 'C', 'WD', 'GD', 'GK'];

export interface Player {
  name: string;
  position: Position;
}

export interface Team {
  id: string;
  name: string;
  managerName?: string;
  phone?: string;
  groupId?: string;
  groupPosition?: number;
  players: Player[];
  logoUrl?: string;
  createdAt?: number;
  uid?: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Scorer {
  playerName: string;
  teamId: string;
  goals: number;
}

export type MatchStage = 'group' | 'quarter' | 'semi' | 'third_place' | 'final';
export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Match {
  id: string;
  date: string;
  time: string;
  court: 'Gelanggang A' | 'Gelanggang B' | 'Gelanggang C' | 'Gelanggang D';
  teamAId?: string;
  teamBId?: string;
  scoreA: number;
  scoreB: number;
  stage: MatchStage;
  status: MatchStatus;
  groupId?: string;
  scorers: Scorer[];
  placeholderLabel?: string;
}

export interface TournamentLink {
  label: string;
  url: string;
}

export interface TournamentInfo {
  id?: string;
  name: string;
  organizer: string;
  manager: string;
  startDate: string;
  endDate: string;
  time: string;
  venue: string;
  mapUrl?: string;
  organizerLogoUrl?: string;
  managerLogoUrl?: string;
  tournamentLogoUrl?: string;
  registrationOpen?: boolean;
  links?: TournamentLink[];
  footerText?: string;
  groupMatchDuration?: number;
  groupBreakDuration?: number;
  knockoutMatchDuration?: number;
  knockoutBreakDuration?: number;
  dailyStartTime?: string;
  dailyEndTime?: string;
  tournamentDays?: number;
  tournamentDates?: string[];
  numGroups?: number;
  teamsPerGroup?: number;
}

export interface TeamStats {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalAverage: number;
  goalDifference: number;
  points: number;
}
