// Auto-generated. Per-entity form-enhancements config for "Aufenthaltsporträts".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "aufenthalt", {"row": ["portraet_datum", "stimmung"], "cols": "1fr 1fr"}, "an_besitzer_gesendet", "geschichte", "highlights"],
  defaults: {
    'portraet_datum': { kind: 'today' },
    'an_besitzer_gesendet': { kind: 'literal', value: false },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
