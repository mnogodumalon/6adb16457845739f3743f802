// Auto-generated. Per-entity form-enhancements config for "Reservierungsanfragen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["anfrage_firstname", "anfrage_lastname"]}, "anfrage_email", "anfrage_telefon", "anfrage_hundename", "anfrage_rasse", {"row": ["wunsch_anreise", "wunsch_abreise"]}, "bearbeitungsstatus", "nachricht"],
  defaults: {
    'wunsch_anreise': { kind: 'today' },
    'wunsch_abreise': { kind: 'todayOffset', days: 3 },
    'bearbeitungsstatus': { kind: 'lookup', key: 'neu', label: 'Neu' },
  },
  computed: {
    '_anfrage_dauer_tage': { kind: 'dateDiff', from: 'wunsch_anreise', to: 'wunsch_abreise', unit: 'days' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
