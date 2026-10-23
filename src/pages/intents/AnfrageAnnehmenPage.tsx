/**
 * Anfrage annehmen — 3-Schritt-Wizard.
 * Steps: 1) Neue Anfrage wählen → 2) Daten prüfen, Unterkunft und Preis ergänzen → 3) Prüfen & anlegen
 *        (legt Besitzer, Hund und Aufenthalt an und setzt die Anfrage auf angenommen).
 * Reads: reservierungsanfragen, aufenthalte (Belegung). Writes: besitzer, hunde, aufenthalte, reservierungsanfragen (update).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, AvailabilityRangePicker, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup, useOccupancy } from '@/lib/journey';
import { useAnfrageAnnehmenFlow, ANFRAGEANNEHMEN_REVIEW_STEP } from '@/lib/journey/flows/AnfrageAnnehmen';
import { tx } from '@/i18n';

function shortDate(iso: string | null): string {
  if (!iso) return '?';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy');
  } catch {
    return iso;
  }
}

export default function AnfrageAnnehmenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnfrageAnnehmenFlow({
    steps: {
      reservierungsanfragen: 1,
      besitzer_firstname: 2, besitzer_lastname: 2, email: 2, telefon: 2,
      hundename: 2, rasse: 2,
      anreise: 2, abreise: 2, unterkunft: 2, preis_pro_tag: 2,
    },
    items: {
      reservierungsanfragen: r => ({
        id: r.id,
        title: `${fieldText(r, 'anfrage_firstname')} ${fieldText(r, 'anfrage_lastname')}`.trim(),
        subtitle: tx`${fieldText(r, 'anfrage_hundename')} · ${shortDate(fieldDate(r, 'wunsch_anreise'))} – ${shortDate(fieldDate(r, 'wunsch_abreise'))}`,
        status: fieldLookup(r, 'bearbeitungsstatus') ?? undefined,
      }),
    },
  });

  const { besitzer, hunde, aufenthalte } = flow.forms;
  const belegung = useOccupancy(flow.port, 'aufenthalte');
  const pick = flow.pick('reservierungsanfragen');

  // Picking a request prefills the three records it becomes.
  const onPick = (id: string) => {
    pick.onSelect(id);
    const r = flow.picks.reservierungsanfragen.recordOf(id);
    if (!r) return;
    besitzer.set('besitzer_firstname', fieldText(r, 'anfrage_firstname'));
    besitzer.set('besitzer_lastname', fieldText(r, 'anfrage_lastname'));
    besitzer.set('email', fieldText(r, 'anfrage_email'));
    besitzer.set('telefon', fieldText(r, 'anfrage_telefon'));
    hunde.set('hundename', fieldText(r, 'anfrage_hundename'));
    hunde.set('rasse', fieldText(r, 'anfrage_rasse'));
    aufenthalte.set('anreise', fieldDate(r, 'wunsch_anreise') ?? '');
    aufenthalte.set('abreise', fieldDate(r, 'wunsch_abreise') ?? '');
    setStep(2);
  };

  const checkStep2 = () => {
    if (!flow.validateStep(2)) return false;
    const from = aufenthalte.get('anreise') as string | null;
    const to = aufenthalte.get('abreise') as string | null;
    if (!belegung.isFree(from, to)) return tx('Die Unterkunft ist in diesem Zeitraum bereits belegt.');
    return true;
  };

  const hasPick = Boolean(pick.selectedId);

  return (
    <IntentWizardShell
      title={tx('Anfrage annehmen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Reservierungsanfrage prüfen und in Besitzer, Hund und Aufenthalt überführen.'),
        needs: [tx('Eine offene Anfrage'), tx('Unterkunft und Preis pro Tag')],
      }}
    >
      <WizardStep label={tx('Anfrage')} description={tx('Welche Anfrage möchtest du annehmen?')}>
        <EntitySelectStep
          {...flow.picks.reservierungsanfragen.select}
          selectedId={pick.selectedId}
          onSelect={onPick}
          searchPlaceholder={tx('Nachname oder Hundename …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Daten prüfen')}
        description={tx('Angaben aus der Anfrage prüfen und Unterkunft sowie Preis ergänzen.')}
        needs={hasPick ? undefined : ['reservierungsanfragen']}
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{tx('Besitzer')}</h3>
            <Bound form={besitzer} name="besitzer_firstname" />
            <Bound form={besitzer} name="besitzer_lastname" />
            <Bound form={besitzer} name="email" />
            <Bound form={besitzer} name="telefon" />
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{tx('Hund')}</h3>
            <Bound form={hunde} name="hundename" />
            <Bound form={hunde} name="rasse" />
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{tx('Aufenthalt')}</h3>
            <AvailabilityRangePicker {...aufenthalte.range('anreise', 'abreise', { blocked: belegung.blocked })} />
            <Bound form={aufenthalte} name="unterkunft" />
            <Bound form={aufenthalte} name="preis_pro_tag" />
          </section>
          <StepNav onBack={() => setStep(1)} onNext={checkStep2} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')} description={tx('Alles richtig? Dann anlegen.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'status_aufenthalt', label: tx('Status des Aufenthalts'), value: tx('Bestätigt') },
              { key: 'status_anfrage', label: tx('Status der Anfrage'), value: tx('Angenommen') },
            ]}
            whatHappensNext={tx('Besitzer, Hund und Aufenthalt werden angelegt, die Anfrage gilt danach als angenommen.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Aufenthaltsporträt erstellen'), href: '#/intents/portraet-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Beim Einchecken oder später kannst du ein Aufenthaltsporträt anlegen.')}
        />
      )}
    </IntentWizardShell>
  );
}

export { ANFRAGEANNEHMEN_REVIEW_STEP };
