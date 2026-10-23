/**
 * useEincheckenFlow — the plumbing of the flow « Hund einchecken », generated from the plan.
 *
 * Changes `hunde` (only when the person fills it): the record to change is picked (`flow.pick('hunde')`), the form is prefilled with its values; asks `impfung_aktuell`.
Changes `aufenthalte`: the record to change is picked (`flow.pick('aufenthalte')`), the form is prefilled with its values; ; sets `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useEincheckenFlow({
 *     steps: { hunde: 1, aufenthalte: 2, impfung_aktuell: 3 },
 *     items: { hunde: r => ({ id: r.id, title: fieldText(r, 'hundename') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.hunde.select} {...flow.pick('hunde')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.aufenthalte.select} {...flow.pick('aufenthalte')} />
 *     <Bound form={flow.forms.hunde} name="impfung_aktuell" />
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
export type EincheckenFieldKey = 'aufenthalte' | 'hunde' | 'impfung_aktuell';

export interface EincheckenForms {
  hunde: StepForm<'hunde'>;
  aufenthalte: StepForm<'aufenthalte'>;
}

// Alias so the option generics stay readable.
type Key = EincheckenFieldKey;

export interface EincheckenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    hunde?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    aufenthalte?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"aufenthalte": 2, "hunde": 1, "impfung_aktuell": 3};
export const EINCHECKEN_REVIEW_STEP = 4;

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

export function useEincheckenFlow(options: EincheckenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [hundeTargetId, setHundeTargetId] = useState<string | null>(null);
  const [aufenthalteTargetId, setAufenthalteTargetId] = useState<string | null>(null);
  const hunde = useStepForm('hunde', {
    fields: ["impfung_aktuell"],
    steps: only(steps, ["impfung_aktuell"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["impfung_aktuell"]),
    messages: only(options.messages as Record<string, string> | undefined, ["impfung_aktuell"]),
  });
  const aufenthalte = useStepForm('aufenthalte', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const forms: EincheckenForms = { hunde, aufenthalte };
  const formList: StepForm[] = [hunde, aufenthalte];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    hunde: useRecordSearch(servicePort, 'hunde', withPickPolicy('hunde', {
      searchFields: ["hundename"] as never,
      toItem: options.items?.hunde as never,
    })),
    aufenthalte: useRecordSearch(servicePort, 'aufenthalte', withPickPolicy('aufenthalte', {
      searchFields: ["unterkunft"] as never,
      filter: "r.v_status == 'bestaetigt' and r.v_anreise <= today()",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "bestaetigt" && (fieldDate(r, "anreise") ?? '') <= isoDaysFromToday(0),
      toItem: options.items?.aufenthalte as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:einchecken:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:einchecken:write:${entity}.${field}`,
  });
  const picks = {
    hunde: { ...searches.hunde, select: { ...searches.hunde.select, create: false as boolean, hint: hintFor('hunde', 'hunde', null as PickWhere | null) } },
    aufenthalte: { ...searches.aufenthalte, select: { ...searches.aufenthalte.select, create: false as boolean, hint: hintFor('aufenthalte', 'aufenthalte', {"conditions": [{"field": "status", "op": "eq", "value": "bestaetigt"}, {"field": "anreise", "op": "lte", "value": {"rel": "today"}}], "mode": "all"} as PickWhere | null) } },
  };

  const hundeFilled = hasValues(hunde);
  const plan: PlanStep[] = [
    ...(hundeFilled ? [{
      key: 'hunde', entity: 'hunde', form: hunde,
      updates: () => hundeTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => hundeTargetId
        ? { key: 'target:hunde', label: entityLabel('hunde'), value: picks.hunde.labelOf(hundeTargetId) ?? hundeTargetId, step: steps.hunde }
        : undefined,    } as PlanStep] : []),
    {
      key: 'aufenthalte', entity: 'aufenthalte', form: aufenthalte, primary: true,
      updates: () => aufenthalteTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => aufenthalteTargetId
        ? { key: 'target:aufenthalte', label: entityLabel('aufenthalte'), value: picks.aufenthalte.labelOf(aufenthalteTargetId) ?? aufenthalteTargetId, step: steps.aufenthalte }
        : undefined,
      values: (): FormValues => ({
        status: policyFixedValue('aufenthalte', 'status') ?? "eingecheckt",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('aufenthalte', 'status', policyFixedValue('aufenthalte', 'status') ?? "eingecheckt")],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'einchecken' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    hunde: {
      selectedId: hundeTargetId,
      onSelect: (id: string) => {
        setHundeTargetId(id);
        const rec = picks.hunde.recordOf(id);
        if (rec) hunde.reset({ impfung_aktuell: rec.fields["impfung_aktuell"] === true, });
      },
      get record(): JourneyRecord | undefined { return hundeTargetId ? picks.hunde.recordOf(hundeTargetId) : undefined; },
    },
    aufenthalte: {
      selectedId: aufenthalteTargetId,
      onSelect: (id: string) => {
        setAufenthalteTargetId(id);
        const rec = picks.aufenthalte.recordOf(id);
        if (rec) aufenthalte.reset({ });
      },
      get record(): JourneyRecord | undefined { return aufenthalteTargetId ? picks.aufenthalte.recordOf(aufenthalteTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/einchecken?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('hunde', linkedId).then(rec => {
      if (!on || !rec) return;
      picks.hunde.adopt(rec);
      targets.hunde.onSelect(rec.id);
    }).catch(() => undefined);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: EincheckenFieldKey) => {
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
  const pickMany = (field: EincheckenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); setHundeTargetId(null); setAufenthalteTargetId(null); };

  return {
    slug: 'einchecken' as const,
    draftKey: 'einchecken' as const,
    entity: 'aufenthalte' as const,
    form: aufenthalte,
    forms, formList, picks, submit, steps, targets,    reviewStep: EINCHECKEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type EincheckenFlow = ReturnType<typeof useEincheckenFlow>;
