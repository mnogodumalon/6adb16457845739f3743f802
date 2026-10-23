import type { Aufenthalte, Aufenthaltsportraets, Hunde } from './app';

export type EnrichedHunde = Hunde & {
  besitzerName: string;
};

export type EnrichedAufenthalte = Aufenthalte & {
  hundName: string;
};

export type EnrichedAufenthaltsportraets = Aufenthaltsportraets & {
  aufenthaltName: string;
};
