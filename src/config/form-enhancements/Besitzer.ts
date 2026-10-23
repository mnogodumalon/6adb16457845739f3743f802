// Auto-generated. Per-entity form-enhancements config for "Besitzer".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["besitzer_firstname", "besitzer_lastname"], "cols": "1fr 1fr"}, {"row": ["email", "telefon"], "cols": "1fr 1fr"}, {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["plz", "ort"], "cols": "1fr 2fr"}, {"row": ["notfallkontakt_firstname", "notfallkontakt_lastname"], "cols": "1fr 1fr"}, "notfallkontakt_telefon", "bemerkungen"],
  defaults: {},
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
