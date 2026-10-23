/**
 * useAnfrageAnnehmenFlow — the plumbing of the flow « Reservierungsanfrage annehmen », generated from the plan.
 *
 * Writes `besitzer`: asks `email`, `telefon`, `besitzer_lastname`, `besitzer_firstname`.
Writes `hunde`: asks `rasse`, `hundename`; links `besitzer` ← the created `besitzer`.
Writes `aufenthalte`: asks `abreise`, `anreise`, `unterkunft`, `preis_pro_tag`; sets `status` itself; links `hund` ← the created `hunde`.
Changes `reservierungsanfragen`: the record to change is picked (`flow.pick('reservierungsanfragen')`), the form is prefilled with its values; ; sets `bearbeitungsstatus` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAnfrageAnnehmenFlow({
 *     steps: { reservierungsanfragen: 1, email: 2, telefon: 2, besitzer_lastname: 2, besitzer_firstname: 2, rasse: 2, hundename: 2, abreise: 2, anreise: 2, unterkunft: 2, preis_pro_tag: 2 },
 *     items: { reservierungsanfragen: r => ({ id: r.id, title: fieldText(r, 'anfrage_firstname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.reservierungsanfragen.select} {...flow.pick('reservierungsanfragen')} />
 *     <Bound form={flow.forms.besitzer} name="email" />
 *     <Bound form={flow.forms.besitzer} name="telefon" />
 *     <Bound form={flow.forms.besitzer} name="besitzer_lastname" />
 *     <Bound form={flow.forms.besitzer} name="besitzer_firstname" />
 *     <Bound form={flow.forms.hunde} name="rasse" />
 *     <Bound form={flow.forms.hunde} name="hundename" />
 *     <Bound form={flow.forms.aufenthalte} name="abreise" />
 *     <Bound form={flow.forms.aufenthalte} name="anreise" />
 *     <Bound form={flow.forms.aufenthalte} name="unterkunft" />
 *     <Bound form={flow.forms.aufenthalte} name="preis_pro_tag" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';
export type AnfrageAnnehmenFieldKey = 'abreise' | 'anreise' | 'besitzer_firstname' | 'besitzer_lastname' | 'email' | 'hundename' | 'preis_pro_tag' | 'rasse' | 'reservierungsanfragen' | 'telefon' | 'unterkunft';

export interface AnfrageAnnehmenForms {
  besitzer: StepForm<'besitzer'>;
  hunde: StepForm<'hunde'>;
  aufenthalte: StepForm<'aufenthalte'>;
  reservierungsanfragen: StepForm<'reservierungsanfragen'>;
}

// Alias so the option generics stay readable.
type Key = AnfrageAnnehmenFieldKey;

export interface AnfrageAnnehmenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    reservierungsanfragen?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"abreise": 2, "anreise": 2, "besitzer_firstname": 2, "besitzer_lastname": 2, "email": 2, "hundename": 2, "preis_pro_tag": 2, "rasse": 2, "reservierungsanfragen": 1, "telefon": 2, "unterkunft": 2};
export const ANFRAGEANNEHMEN_REVIEW_STEP = 3;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useAnfrageAnnehmenFlow(options: AnfrageAnnehmenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [reservierungsanfragenTargetId, setReservierungsanfragenTargetId] = useState<string | null>(null);
  const besitzer = useStepForm('besitzer', {
    fields: ["email", "telefon", "besitzer_lastname", "besitzer_firstname"],
    steps: only(steps, ["email", "telefon", "besitzer_lastname", "besitzer_firstname"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["email", "telefon", "besitzer_lastname", "besitzer_firstname"]),
    messages: only(options.messages as Record<string, string> | undefined, ["email", "telefon", "besitzer_lastname", "besitzer_firstname"]),
  });
  const hunde = useStepForm('hunde', {
    fields: ["rasse", "hundename"],
    steps: only(steps, ["rasse", "hundename"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["rasse", "hundename"]),
    messages: only(options.messages as Record<string, string> | undefined, ["rasse", "hundename"]),
  });
  const aufenthalte = useStepForm('aufenthalte', {
    fields: ["abreise", "anreise", "unterkunft", "preis_pro_tag"],
    steps: only(steps, ["abreise", "anreise", "unterkunft", "preis_pro_tag"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["abreise", "anreise", "unterkunft", "preis_pro_tag"]),
    messages: only(options.messages as Record<string, string> | undefined, ["abreise", "anreise", "unterkunft", "preis_pro_tag"]),
  });
  const reservierungsanfragen = useStepForm('reservierungsanfragen', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const forms: AnfrageAnnehmenForms = { besitzer, hunde, aufenthalte, reservierungsanfragen };
  const formList: StepForm[] = [besitzer, hunde, aufenthalte, reservierungsanfragen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    reservierungsanfragen: useRecordSearch(servicePort, 'reservierungsanfragen', withPickPolicy('reservierungsanfragen', {
      searchFields: ["anfrage_firstname", "anfrage_lastname", "anfrage_email", "anfrage_telefon", "anfrage_hundename", "anfrage_rasse", "nachricht"] as never,
      filter: "r.v_bearbeitungsstatus in ['neu', 'in_pruefung']",
      where: (r: JourneyRecord) => ["neu", "in_pruefung"].includes(fieldLookup(r, "bearbeitungsstatus")?.key ?? ''),
      toItem: options.items?.reservierungsanfragen as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:anfrage-annehmen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:anfrage-annehmen:write:${entity}.${field}`,
  });
  const picks = {
    reservierungsanfragen: { ...searches.reservierungsanfragen, select: { ...searches.reservierungsanfragen.select, create: false as boolean, hint: hintFor('reservierungsanfragen', 'reservierungsanfragen', {"conditions": [{"field": "bearbeitungsstatus", "op": "in", "value": ["neu", "in_pruefung"]}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'besitzer', entity: 'besitzer', form: besitzer,    },
    {
      key: 'hunde', entity: 'hunde', form: hunde,      needs: ['besitzer'],
      link: { besitzer: 'besitzer' },
    },
    {
      key: 'aufenthalte', entity: 'aufenthalte', form: aufenthalte, primary: true,      needs: ['hunde'],
      link: { hund: 'hunde' },

      values: (): FormValues => ({
        status: policyFixedValue('aufenthalte', 'status') ?? "bestaetigt",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('aufenthalte', 'status', policyFixedValue('aufenthalte', 'status') ?? "bestaetigt")],
    },
    {
      key: 'reservierungsanfragen', entity: 'reservierungsanfragen', form: reservierungsanfragen,
      updates: () => reservierungsanfragenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => reservierungsanfragenTargetId
        ? { key: 'target:reservierungsanfragen', label: entityLabel('reservierungsanfragen'), value: picks.reservierungsanfragen.labelOf(reservierungsanfragenTargetId) ?? reservierungsanfragenTargetId, step: steps.reservierungsanfragen }
        : undefined,
      values: (): FormValues => ({
        bearbeitungsstatus: policyFixedValue('reservierungsanfragen', 'bearbeitungsstatus') ?? "angenommen",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('reservierungsanfragen', 'bearbeitungsstatus', policyFixedValue('reservierungsanfragen', 'bearbeitungsstatus') ?? "angenommen")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'anfrage-annehmen' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    reservierungsanfragen: {
      selectedId: reservierungsanfragenTargetId,
      onSelect: (id: string) => {
        setReservierungsanfragenTargetId(id);
        const rec = picks.reservierungsanfragen.recordOf(id);
        if (rec) reservierungsanfragen.reset({ });
      },
      get record(): JourneyRecord | undefined { return reservierungsanfragenTargetId ? picks.reservierungsanfragen.recordOf(reservierungsanfragenTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/anfrage-annehmen?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('reservierungsanfragen', linkedId).then(rec => {
      if (!on || !rec || !((r: JourneyRecord) => ["neu", "in_pruefung"].includes(fieldLookup(r, "bearbeitungsstatus")?.key ?? ''))(rec)) return;
      picks.reservierungsanfragen.adopt(rec);
      targets.reservierungsanfragen.onSelect(rec.id);
    }).catch(() => undefined);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AnfrageAnnehmenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AnfrageAnnehmenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setReservierungsanfragenTargetId(null); };

  return {
    slug: 'anfrage-annehmen' as const,
    draftKey: 'anfrage-annehmen' as const,
    entity: 'aufenthalte' as const,
    form: aufenthalte,
    forms, formList, picks, submit, steps, targets,    reviewStep: ANFRAGEANNEHMEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AnfrageAnnehmenFlow = ReturnType<typeof useAnfrageAnnehmenFlow>;
