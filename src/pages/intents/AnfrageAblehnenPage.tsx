/**
 * Reservierungsanfrage ablehnen — 2-Schritt-Wizard.
 * Steps: 1) Anfrage aus der Liste wählen → 2) Ablehnung prüfen & bestätigen.
 * Reads: reservierungsanfragen. Writes: reservierungsanfragen (bearbeitungsstatus = abgelehnt, via useAnfrageAblehnenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup, formatRange } from '@/lib/journey';
import { useAnfrageAblehnenFlow } from '@/lib/journey/flows/AnfrageAblehnen';
import { tx } from '@/i18n';

export default function AnfrageAblehnenPage() {
  const [step, setStep] = useState(1);
  const flow = useAnfrageAblehnenFlow({
    steps: { reservierungsanfragen: 1 },
    items: {
      reservierungsanfragen: r => ({
        id: r.id,
        title: `${fieldText(r, 'anfrage_lastname')} — ${fieldText(r, 'anfrage_hundename')}`,
        subtitle: formatRange(fieldDate(r, 'wunsch_anreise'), fieldDate(r, 'wunsch_abreise'), 'none'),
        status: fieldLookup(r, 'bearbeitungsstatus') ?? undefined,
      }),
    },
  });

  return (
    <IntentWizardShell
      title={tx('Reservierungsanfrage ablehnen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Anfrage prüfen und auf „Abgelehnt“ setzen.'),
        needs: [tx('Nachname oder Hundename der Anfrage')],
      }}
    >
      <WizardStep label={tx('Anfrage')} description={tx('Welche Anfrage möchtest du ablehnen? Offene Anfragen suchst du nach Nachname oder Hundename.')}>
        <EntitySelectStep
          {...flow.picks.reservierungsanfragen.select}
          {...flow.pick('reservierungsanfragen')}
          avatar="initials"
          searchPlaceholder={tx('Nachname oder Hundename …')}
        />
      </WizardStep>
      <WizardStep label={tx('Prüfen')} description={tx('Stimmt die Anfrage? Mit der Bestätigung wird sie abgelehnt.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'bearbeitungsstatus', label: tx('Neuer Status'), value: tx('Abgelehnt') }]}
            whatHappensNext={tx('Die Anfrage steht danach auf „Abgelehnt“ und taucht nicht mehr unter den offenen Anfragen auf.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Weitere Anfrage ablehnen') },
            { label: tx('Anfrage annehmen'), href: '#/intents/anfrage-annehmen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
