/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'besitzer' | 'hunde' | 'aufenthalte' | 'aufenthaltsportraets' | 'reservierungsanfragen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "besitzer": "besitzer_firstname" | "besitzer_lastname" | "email" | "telefon" | "strasse" | "hausnummer" | "plz" | "ort" | "notfallkontakt_firstname" | "notfallkontakt_lastname" | "notfallkontakt_telefon" | "bemerkungen";
  "hunde": "hundename" | "rasse" | "tierarzt" | "futterhinweise" | "medikamente" | "vertraeglichkeit";
  "aufenthalte": "unterkunft" | "besonderheiten" | "interne_notizen";
  "aufenthaltsportraets": "titel" | "geschichte" | "highlights";
  "reservierungsanfragen": "anfrage_firstname" | "anfrage_lastname" | "anfrage_email" | "anfrage_telefon" | "anfrage_hundename" | "anfrage_rasse" | "nachricht";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "besitzer": never;
  "hunde": "besitzer";
  "aufenthalte": "hund";
  "aufenthaltsportraets": "aufenthalt";
  "reservierungsanfragen": never;
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "besitzer": {
    "key": "besitzer",
    "appId": "6adb161d92b82d6915c87812",
    "label": "Besitzer",
    "pascal": "Besitzer",
    "single": "BesitzerEntry"
  },
  "hunde": {
    "key": "hunde",
    "appId": "6adb162174db0e8a90fa38cb",
    "label": "Hunde",
    "pascal": "Hunde",
    "single": "HundeEntry"
  },
  "aufenthalte": {
    "key": "aufenthalte",
    "appId": "6adb1622476b5049194098b3",
    "label": "Aufenthalte",
    "pascal": "Aufenthalte",
    "single": "AufenthalteEntry"
  },
  "aufenthaltsportraets": {
    "key": "aufenthaltsportraets",
    "appId": "6adb1623e7c32799558f9cde",
    "label": "Aufenthaltsporträts",
    "pascal": "Aufenthaltsportraets",
    "single": "Aufenthaltsportraet"
  },
  "reservierungsanfragen": {
    "key": "reservierungsanfragen",
    "appId": "6adb1623010adc55b603e7a1",
    "label": "Reservierungsanfragen",
    "pascal": "Reservierungsanfragen",
    "single": "ReservierungsanfragenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "besitzer": {
    "besitzer_firstname": {
      "key": "besitzer_firstname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "besitzer_lastname": {
      "key": "besitzer_lastname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "notfallkontakt_firstname": {
      "key": "notfallkontakt_firstname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Notfallkontakt Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "notfallkontakt_lastname": {
      "key": "notfallkontakt_lastname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Notfallkontakt Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "notfallkontakt_telefon": {
      "key": "notfallkontakt_telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Notfallkontakt Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "bemerkungen": {
      "key": "bemerkungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkungen",
      "writable": true
    }
  },
  "hunde": {
    "hundename": {
      "key": "hundename",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name des Hundes",
      "writable": true,
      "maxLength": 4000
    },
    "besitzer": {
      "key": "besitzer",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Besitzer",
      "writable": true,
      "targetAppId": "6adb161d92b82d6915c87812",
      "targetEntity": "besitzer"
    },
    "rasse": {
      "key": "rasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rasse",
      "writable": true,
      "maxLength": 4000
    },
    "geschlecht": {
      "key": "geschlecht",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Geschlecht",
      "writable": true,
      "options": [
        "ruede",
        "huendin"
      ]
    },
    "geburtsdatum": {
      "key": "geburtsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Geburtsdatum",
      "writable": true,
      "autoComplete": "bday"
    },
    "gewicht": {
      "key": "gewicht",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gewicht in kg",
      "writable": true
    },
    "kastriert": {
      "key": "kastriert",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Kastriert",
      "writable": true
    },
    "impfung_aktuell": {
      "key": "impfung_aktuell",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Impfschutz aktuell",
      "writable": true
    },
    "tierarzt": {
      "key": "tierarzt",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Tierarzt",
      "writable": true,
      "maxLength": 4000
    },
    "futterhinweise": {
      "key": "futterhinweise",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Futterhinweise",
      "writable": true
    },
    "medikamente": {
      "key": "medikamente",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Medikamente",
      "writable": true
    },
    "vertraeglichkeit": {
      "key": "vertraeglichkeit",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Verträglichkeit und Besonderheiten",
      "writable": true
    }
  },
  "aufenthalte": {
    "hund": {
      "key": "hund",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Hund",
      "writable": true,
      "targetAppId": "6adb162174db0e8a90fa38cb",
      "targetEntity": "hunde"
    },
    "anreise": {
      "key": "anreise",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Anreisedatum",
      "writable": true
    },
    "abreise": {
      "key": "abreise",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Abreisedatum",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "angefragt",
        "bestaetigt",
        "eingecheckt",
        "abgeschlossen",
        "storniert"
      ]
    },
    "unterkunft": {
      "key": "unterkunft",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Unterkunft oder Zimmer",
      "writable": true,
      "maxLength": 4000
    },
    "preis_pro_tag": {
      "key": "preis_pro_tag",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Preis pro Tag in Euro",
      "writable": true,
      "format": "currency"
    },
    "besonderheiten": {
      "key": "besonderheiten",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Besonderheiten zum Aufenthalt",
      "writable": true
    },
    "interne_notizen": {
      "key": "interne_notizen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Interne Notizen",
      "writable": true
    }
  },
  "aufenthaltsportraets": {
    "aufenthalt": {
      "key": "aufenthalt",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Aufenthalt",
      "writable": true,
      "targetAppId": "6adb1622476b5049194098b3",
      "targetEntity": "aufenthalte"
    },
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel",
      "writable": true,
      "maxLength": 4000
    },
    "foto": {
      "key": "foto",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Foto",
      "writable": false
    },
    "geschichte": {
      "key": "geschichte",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Geschichte",
      "writable": true
    },
    "highlights": {
      "key": "highlights",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Highlights",
      "writable": true
    },
    "stimmung": {
      "key": "stimmung",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Stimmung",
      "writable": true,
      "options": [
        "froehlich",
        "entspannt",
        "verspielt",
        "muede",
        "schuechtern"
      ]
    },
    "portraet_datum": {
      "key": "portraet_datum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Datum des Porträts",
      "writable": true
    },
    "an_besitzer_gesendet": {
      "key": "an_besitzer_gesendet",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "An Besitzer gesendet",
      "writable": true
    }
  },
  "reservierungsanfragen": {
    "anfrage_firstname": {
      "key": "anfrage_firstname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "anfrage_lastname": {
      "key": "anfrage_lastname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "anfrage_email": {
      "key": "anfrage_email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "anfrage_telefon": {
      "key": "anfrage_telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "anfrage_hundename": {
      "key": "anfrage_hundename",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Name des Hundes",
      "writable": true,
      "maxLength": 4000
    },
    "anfrage_rasse": {
      "key": "anfrage_rasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Rasse",
      "writable": true,
      "maxLength": 4000
    },
    "wunsch_anreise": {
      "key": "wunsch_anreise",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Gewünschte Anreise",
      "writable": true
    },
    "wunsch_abreise": {
      "key": "wunsch_abreise",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Gewünschte Abreise",
      "writable": true
    },
    "nachricht": {
      "key": "nachricht",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Nachricht",
      "writable": true
    },
    "bearbeitungsstatus": {
      "key": "bearbeitungsstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Bearbeitungsstatus",
      "writable": true,
      "options": [
        "neu",
        "in_pruefung",
        "angenommen",
        "abgelehnt"
      ]
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "besitzer": [],
  "hunde": [
    {
      "kind": "choice",
      "field": "geschlecht",
      "count": 2
    },
    {
      "kind": "record",
      "field": "besitzer",
      "targetEntity": "besitzer"
    }
  ],
  "aufenthalte": [
    {
      "kind": "range",
      "from": "anreise",
      "to": "abreise"
    },
    {
      "kind": "choice",
      "field": "status",
      "count": 5
    },
    {
      "kind": "record",
      "field": "hund",
      "targetEntity": "hunde"
    }
  ],
  "aufenthaltsportraets": [
    {
      "kind": "choice",
      "field": "stimmung",
      "count": 5
    },
    {
      "kind": "record",
      "field": "aufenthalt",
      "targetEntity": "aufenthalte"
    }
  ],
  "reservierungsanfragen": [
    {
      "kind": "range",
      "from": "wunsch_anreise",
      "to": "wunsch_abreise"
    },
    {
      "kind": "choice",
      "field": "bearbeitungsstatus",
      "count": 4
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "besitzer": [
    "besitzer_firstname"
  ],
  "hunde": [
    "hundename"
  ],
  "aufenthalte": [
    "unterkunft"
  ],
  "aufenthaltsportraets": [
    "titel"
  ],
  "reservierungsanfragen": [
    "anfrage_firstname"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
