import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Besitzer {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    besitzer_firstname?: string;
    besitzer_lastname?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    notfallkontakt_firstname?: string;
    notfallkontakt_lastname?: string;
    notfallkontakt_telefon?: string;
    bemerkungen?: string;
  };
}

export interface Hunde {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    hundename?: string;
    besitzer?: RecordUrl; // applookup -> URL zu 'Besitzer' Record
    rasse?: string;
    geschlecht?: LookupValue;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    gewicht?: number;
    kastriert?: boolean;
    impfung_aktuell?: boolean;
    tierarzt?: string;
    futterhinweise?: string;
    medikamente?: string;
    vertraeglichkeit?: string;
  };
}

export interface Aufenthalte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    hund?: RecordUrl; // applookup -> URL zu 'Hunde' Record
    anreise?: string; // Format: YYYY-MM-DD oder ISO String
    abreise?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    unterkunft?: string;
    preis_pro_tag?: number;
    besonderheiten?: string;
    interne_notizen?: string;
  };
}

export interface Aufenthaltsportraets {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    aufenthalt?: RecordUrl; // applookup -> URL zu 'Aufenthalte' Record
    titel?: string;
    foto?: string;
    geschichte?: string;
    highlights?: string;
    stimmung?: LookupValue;
    portraet_datum?: string; // Format: YYYY-MM-DD oder ISO String
    an_besitzer_gesendet?: boolean;
  };
}

export interface Reservierungsanfragen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    anfrage_firstname?: string;
    anfrage_lastname?: string;
    anfrage_email?: string;
    anfrage_telefon?: string;
    anfrage_hundename?: string;
    anfrage_rasse?: string;
    wunsch_anreise?: string; // Format: YYYY-MM-DD oder ISO String
    wunsch_abreise?: string; // Format: YYYY-MM-DD oder ISO String
    nachricht?: string;
    bearbeitungsstatus?: LookupValue;
  };
}

export const APP_IDS = {
  BESITZER: '6adb161d92b82d6915c87812',
  HUNDE: '6adb162174db0e8a90fa38cb',
  AUFENTHALTE: '6adb1622476b5049194098b3',
  AUFENTHALTSPORTRAETS: '6adb1623e7c32799558f9cde',
  RESERVIERUNGSANFRAGEN: '6adb1623010adc55b603e7a1',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'hunde': {
    geschlecht: [{ key: "ruede", get label() { return lookupLabel('hunde', 'geschlecht', "ruede") ?? "Rüde"; } }, { key: "huendin", get label() { return lookupLabel('hunde', 'geschlecht', "huendin") ?? "Hündin"; } }],
  },
  'aufenthalte': {
    status: [{ key: "angefragt", get label() { return lookupLabel('aufenthalte', 'status', "angefragt") ?? "Angefragt"; } }, { key: "bestaetigt", get label() { return lookupLabel('aufenthalte', 'status', "bestaetigt") ?? "Bestätigt"; } }, { key: "eingecheckt", get label() { return lookupLabel('aufenthalte', 'status', "eingecheckt") ?? "Eingecheckt"; } }, { key: "abgeschlossen", get label() { return lookupLabel('aufenthalte', 'status', "abgeschlossen") ?? "Abgeschlossen"; } }, { key: "storniert", get label() { return lookupLabel('aufenthalte', 'status', "storniert") ?? "Storniert"; } }],
  },
  'aufenthaltsportraets': {
    stimmung: [{ key: "froehlich", get label() { return lookupLabel('aufenthaltsportraets', 'stimmung', "froehlich") ?? "Fröhlich"; } }, { key: "entspannt", get label() { return lookupLabel('aufenthaltsportraets', 'stimmung', "entspannt") ?? "Entspannt"; } }, { key: "verspielt", get label() { return lookupLabel('aufenthaltsportraets', 'stimmung', "verspielt") ?? "Verspielt"; } }, { key: "muede", get label() { return lookupLabel('aufenthaltsportraets', 'stimmung', "muede") ?? "Müde"; } }, { key: "schuechtern", get label() { return lookupLabel('aufenthaltsportraets', 'stimmung', "schuechtern") ?? "Schüchtern"; } }],
  },
  'reservierungsanfragen': {
    bearbeitungsstatus: [{ key: "neu", get label() { return lookupLabel('reservierungsanfragen', 'bearbeitungsstatus', "neu") ?? "Neu"; } }, { key: "in_pruefung", get label() { return lookupLabel('reservierungsanfragen', 'bearbeitungsstatus', "in_pruefung") ?? "In Prüfung"; } }, { key: "angenommen", get label() { return lookupLabel('reservierungsanfragen', 'bearbeitungsstatus', "angenommen") ?? "Angenommen"; } }, { key: "abgelehnt", get label() { return lookupLabel('reservierungsanfragen', 'bearbeitungsstatus', "abgelehnt") ?? "Abgelehnt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'besitzer': {
    'besitzer_firstname': 'string/text',
    'besitzer_lastname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'notfallkontakt_firstname': 'string/text',
    'notfallkontakt_lastname': 'string/text',
    'notfallkontakt_telefon': 'string/tel',
    'bemerkungen': 'string/textarea',
  },
  'hunde': {
    'hundename': 'string/text',
    'besitzer': 'applookup/select',
    'rasse': 'string/text',
    'geschlecht': 'lookup/radio',
    'geburtsdatum': 'date/date',
    'gewicht': 'number',
    'kastriert': 'bool',
    'impfung_aktuell': 'bool',
    'tierarzt': 'string/text',
    'futterhinweise': 'string/textarea',
    'medikamente': 'string/textarea',
    'vertraeglichkeit': 'string/textarea',
  },
  'aufenthalte': {
    'hund': 'applookup/select',
    'anreise': 'date/date',
    'abreise': 'date/date',
    'status': 'lookup/select',
    'unterkunft': 'string/text',
    'preis_pro_tag': 'number',
    'besonderheiten': 'string/textarea',
    'interne_notizen': 'string/textarea',
  },
  'aufenthaltsportraets': {
    'aufenthalt': 'applookup/select',
    'titel': 'string/text',
    'foto': 'file',
    'geschichte': 'string/textarea',
    'highlights': 'string/textarea',
    'stimmung': 'lookup/select',
    'portraet_datum': 'date/date',
    'an_besitzer_gesendet': 'bool',
  },
  'reservierungsanfragen': {
    'anfrage_firstname': 'string/text',
    'anfrage_lastname': 'string/text',
    'anfrage_email': 'string/email',
    'anfrage_telefon': 'string/tel',
    'anfrage_hundename': 'string/text',
    'anfrage_rasse': 'string/text',
    'wunsch_anreise': 'date/date',
    'wunsch_abreise': 'date/date',
    'nachricht': 'string/textarea',
    'bearbeitungsstatus': 'lookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBesitzer = StripLookup<Besitzer['fields']>;
export type CreateHunde = StripLookup<Hunde['fields']>;
export type CreateAufenthalte = StripLookup<Aufenthalte['fields']>;
export type CreateAufenthaltsportraets = StripLookup<Aufenthaltsportraets['fields']>;
export type CreateReservierungsanfragen = StripLookup<Reservierungsanfragen['fields']>;