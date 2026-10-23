/**
 * usePortraetErstellenFlow — the plumbing of the flow « Aufenthaltsporträt erstellen », generated from the plan.
 *
 * Writes `aufenthaltsportraets`: asks `foto`, `titel`, `stimmung`, `aufenthalt`, `geschichte`, `highlights`; sets `portraet_datum`, `an_besitzer_gesendet` itself.
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
 *   const flow = usePortraetErstellenFlow({
 *     steps: { aufenthalt: 1, foto: 2, titel: 2, stimmung: 2, geschichte: 2, highlights: 2 },
 *     items: { aufenthalt: r => ({ id: r.id, title: fieldText(r, 'unterkunft') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.aufenthalt.select} {...flow.pick('aufenthalt')} />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="foto" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="titel" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="stimmung" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="geschichte" />
 *     <Bound form={flow.forms.aufenthaltsportraets} name="highlights" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type PortraetErstellenFieldKey = 'aufenthalt' | 'foto' | 'geschichte' | 'highlights' | 'stimmung' | 'titel';

export interface PortraetErstellenForms {
  aufenthaltsportraets: StepForm<'aufenthaltsportraets'>;
}

// Alias so the option generics stay readable.
type Key = PortraetErstellenFieldKey;

export interface PortraetErstellenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    aufenthalt?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"aufenthalt": 1, "foto": 2, "geschichte": 2, "highlights": 2, "stimmung": 2, "titel": 2};
export const PORTRAETERSTELLEN_REVIEW_STEP = 3;

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

export function usePortraetErstellenFlow(options: PortraetErstellenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const aufenthaltsportraets = useStepForm('aufenthaltsportraets', {
    fields: ["foto", "titel", "stimmung", "aufenthalt", "geschichte", "highlights"],
    steps: only(steps, ["foto", "titel", "stimmung", "aufenthalt", "geschichte", "highlights"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["foto", "titel", "stimmung", "aufenthalt", "geschichte", "highlights"]),
    messages: only(options.messages as Record<string, string> | undefined, ["foto", "titel", "stimmung", "aufenthalt", "geschichte", "highlights"]),
  });
  const forms: PortraetErstellenForms = { aufenthaltsportraets };
  const formList: StepForm[] = [aufenthaltsportraets];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    aufenthalt: useRecordSearch(servicePort, 'aufenthalte', withPickPolicy('aufenthalt', {
      searchFields: ["unterkunft"] as never,
      filter: "r.v_status == 'eingecheckt' or r.v_status == 'abgeschlossen'",
      where: (r: JourneyRecord) => (fieldLookup(r, "status")?.key ?? null) === "eingecheckt" || (fieldLookup(r, "status")?.key ?? null) === "abgeschlossen",
      toItem: options.items?.aufenthalt as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:portraet-erstellen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:portraet-erstellen:write:${entity}.${field}`,
  });
  const picks = {
    aufenthalt: { ...searches.aufenthalt, select: { ...searches.aufenthalt.select, create: false as boolean, hint: hintFor('aufenthalt', 'aufenthalte', {"conditions": [{"field": "status", "op": "eq", "value": "eingecheckt"}, {"field": "status", "op": "eq", "value": "abgeschlossen"}], "mode": "any"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'aufenthaltsportraets', entity: 'aufenthaltsportraets', form: aufenthaltsportraets, primary: true,
      values: (): FormValues => ({
        portraet_datum: policyFixedValue('aufenthaltsportraets', 'portraet_datum') ?? todayIso(),
        an_besitzer_gesendet: policyFixedValue('aufenthaltsportraets', 'an_besitzer_gesendet') ?? false,
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('aufenthaltsportraets', 'an_besitzer_gesendet', policyFixedValue('aufenthaltsportraets', 'an_besitzer_gesendet') ?? false)],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'portraet-erstellen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: PortraetErstellenFieldKey) => {
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
  const pickMany = (field: PortraetErstellenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'portraet-erstellen' as const,
    draftKey: 'portraet-erstellen' as const,
    entity: 'aufenthaltsportraets' as const,
    form: aufenthaltsportraets,
    forms, formList, picks, submit, steps,    reviewStep: PORTRAETERSTELLEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type PortraetErstellenFlow = ReturnType<typeof usePortraetErstellenFlow>;
