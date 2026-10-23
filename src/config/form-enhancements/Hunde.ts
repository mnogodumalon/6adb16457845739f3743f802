// Auto-generated. Per-entity form-enhancements config for "Hunde".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["hundename", "besitzer"], "cols": "1fr 1fr"}, {"row": ["rasse", "geschlecht"], "cols": "1fr 1fr"}, {"row": ["geburtsdatum", "gewicht"], "cols": "1fr 1fr"}, {"row": ["kastriert", "impfung_aktuell"], "cols": "1fr 1fr"}, "tierarzt", "futterhinweise", "medikamente", "vertraeglichkeit"],
  defaults: {},
  computed: {},
  numberFields: {
    'gewicht': { max: 150 },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
