// Auto-generated. Per-entity form-enhancements config for "Aufenthalte".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["hund", {"row": ["anreise", "abreise"]}, "status", {"row": ["unterkunft", "preis_pro_tag"], "cols": "2fr 1fr"}, "besonderheiten", "interne_notizen"],
  defaults: {
    'anreise': { kind: 'today' },
    'abreise': { kind: 'todayOffset', days: 3 },
    'status': { kind: 'lookup', key: 'angefragt', label: 'Angefragt' },
  },
  computed: {
    '_aufenthalt_dauer_tage': { kind: 'dateDiff', from: 'anreise', to: 'abreise', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
