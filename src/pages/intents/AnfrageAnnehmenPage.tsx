/**
 * Reservierungsanfrage annehmen — 5-Schritt-Wizard.
 * Steps: 1) Anfrage wählen → 2) Besitzer & Hund prüfen → 3) Unterkunft & Preis → 4) Zeitraum & Verfügbarkeit → 5) Prüfen & annehmen.
 * Reads: reservierungsanfragen (Auswahl), aufenthalte (Belegung). Writes: besitzer, hunde, aufenthalte (Status Bestätigt), reservierungsanfragen (Status Angenommen).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, AvailabilityRangePicker, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup, useOccupancy } from '@/lib/journey';
import { useAnfrageAnnehmenFlow } from '@/lib/journey/flows/AnfrageAnnehmen';
import { formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';

const FREE_STATUS = ['angefragt', 'abgeschlossen', 'storniert'];

export default function AnfrageAnnehmenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnfrageAnnehmenFlow({
    steps: {
      reservierungsanfragen: 1,
      besitzer_firstname: 2, besitzer_lastname: 2, email: 2, telefon: 2, hundename: 2, rasse: 2,
      unterkunft: 3, preis_pro_tag: 3,
      anreise: 4, abreise: 4,
    },
    items: {
      reservierungsanfragen: r => ({
        id: r.id,
        title: `${fieldText(r, 'anfrage_firstname')} ${fieldText(r, 'anfrage_lastname')}`.trim(),
        subtitle: tx`${fieldText(r, 'anfrage_hundename')} · ${formatDate(fieldDate(r, 'wunsch_anreise') ?? '')} – ${formatDate(fieldDate(r, 'wunsch_abreise') ?? '')}`,
        status: fieldLookup(r, 'bearbeitungsstatus') ?? undefined,
      }),
    },
  });
  const { besitzer, hunde, aufenthalte } = flow.forms;
  const request = flow.targets.reservierungsanfragen.record;

  const unterkunft = String(aufenthalte.get('unterkunft') ?? '');
  const belegung = useOccupancy(flow.port, 'aufenthalte', { resource: unterkunft || null });

  // Picking the request prefills the three forms the flow writes — the person only checks and completes.
  const pickRequest = flow.pick('reservierungsanfragen');
  const onPick = (id: string) => {
    pickRequest.onSelect(id);
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
  };

  // The rule from the brief: no second stay in the same accommodation for overlapping dates.
  const checkAvailability = async (): Promise<boolean | string> => {
    if (!flow.validateStep(4)) return false;
    const from = String(aufenthalte.get('anreise') ?? '');
    const to = String(aufenthalte.get('abreise') ?? '');
    const name = unterkunft.trim().toLowerCase();
    if (!name) return true;
    const stays = await flow.port.list('aufenthalte');
    const clash = stays.some(s => {
      if (FREE_STATUS.includes(fieldLookup(s, 'status')?.key ?? '')) return false;
      if (fieldText(s, 'unterkunft').trim().toLowerCase() !== name) return false;
      const sFrom = fieldDate(s, 'anreise');
      const sTo = fieldDate(s, 'abreise');
      return !!sFrom && !!sTo && sFrom < to && from < sTo;
    });
    return clash ? tx('Diese Unterkunft ist im gewählten Zeitraum bereits belegt.') : true;
  };

  const restart = () => { flow.reset(); setStep(1); };

  const requestCard = request && (
    <div className="flex items-start gap-3 rounded-xl border bg-secondary/50 p-3 text-sm overflow-hidden">
      <IconInfoCircle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-medium truncate">
          {fieldText(request, 'anfrage_firstname')} {fieldText(request, 'anfrage_lastname')} · {fieldText(request, 'anfrage_hundename')}
        </p>
        <p className="text-muted-foreground">
          {tx`Wunschzeitraum: ${formatDate(fieldDate(request, 'wunsch_anreise') ?? '')} – ${formatDate(fieldDate(request, 'wunsch_abreise') ?? '')}`}
        </p>
        {fieldText(request, 'nachricht') && <p className="mt-1 line-clamp-3 text-muted-foreground">{fieldText(request, 'nachricht')}</p>}
      </div>
    </div>
  );
  const noRequest = (
    <StepNav onBack={() => setStep(1)} nextDisabled>
      {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
    </StepNav>
  );

  return (
    <IntentWizardShell
      title={tx('Reservierungsanfrage annehmen')}
      currentStep={step} onStepChange={setStep}
      forms={flow.formList} draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Anfrage prüfen und als bestätigten Aufenthalt übernehmen.'),
        needs: [tx('Unterkunft für den Hund'), tx('Preis pro Tag')],
      }}
    >
      <WizardStep label={tx('Anfrage')} description={tx('Welche Anfrage möchtest du annehmen?')}>
        <EntitySelectStep {...flow.picks.reservierungsanfragen.select} selectedId={pickRequest.selectedId}
          onSelect={id => onPick(id)} avatar="initials"
          searchPlaceholder={tx('Nachname oder Hundename …')}
          emptyText={tx('Es gibt keine neue Anfrage, die noch bearbeitet werden muss.')} />
      </WizardStep>

      <WizardStep label={tx('Besitzer & Hund')} description={tx('Daten aus der Anfrage prüfen und ergänzen.')}>
        {request ? (
          <div className="space-y-4">
            {requestCard}
            <div className="grid gap-4 sm:grid-cols-2">
              <Bound form={besitzer} name="besitzer_firstname" />
              <Bound form={besitzer} name="besitzer_lastname" />
              <Bound form={besitzer} name="email" />
              <Bound form={besitzer} name="telefon" />
              <Bound form={hunde} name="hundename" />
              <Bound form={hunde} name="rasse" />
            </div>
            <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Unterkunft')} />
          </div>
        ) : noRequest}
      </WizardStep>

      <WizardStep label={tx('Unterkunft & Preis')} description={tx('Wo wohnt der Hund und was kostet ein Tag?')}>
        {request ? (
          <div className="space-y-4">
            <Bound form={aufenthalte} name="unterkunft" hint={tx('Zimmer oder Box, z. B. „Zimmer 3“')} />
            <Bound form={aufenthalte} name="preis_pro_tag" hint={tx('In Euro, z. B. 35')} />
            <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Zeitraum')} />
          </div>
        ) : noRequest}
      </WizardStep>

      <WizardStep label={tx('Zeitraum')} description={tx('Aufenthalt festlegen — belegte Nächte dieser Unterkunft sind ausgegraut.')}>
        {request ? (
          <div className="space-y-4">
            {requestCard}
            <AvailabilityRangePicker {...aufenthalte.range('anreise', 'abreise', { blocked: belegung.blocked })} blocked={belegung.blocked} />
            <StepNav onBack={() => setStep(3)} onNext={checkAvailability} nextStepLabel={tx('Prüfen')} />
          </div>
        ) : noRequest}
      </WizardStep>

      <WizardStep label={tx('Prüfen')} description={tx('Alles richtig? Danach ist die Anfrage angenommen.')}>
        {!flow.submit.done && (
          <SummaryStep forms={flow.formList} submit={flow.submit}
            confirmLabel={tx('Anfrage annehmen')}
            whatHappensNext={tx('Besitzer und Hund werden angelegt, der Aufenthalt wird als bestätigt eingetragen und die Anfrage auf „Angenommen“ gesetzt.')} />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep result={flow.submit.result} forms={flow.formList}
          title={tx('Anfrage angenommen')}
          next={[
            { label: tx('Noch eine Anfrage bearbeiten'), onClick: restart },
            { label: tx('Hund einchecken'), href: '#/intents/hund-einchecken' },
            { label: tx('Aufenthalt planen'), href: '#/intents/aufenthalt-planen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Beim Eintreffen des Hundes kannst du ihn mit „Hund einchecken“ einchecken.')} />
      )}
    </IntentWizardShell>
  );
}
