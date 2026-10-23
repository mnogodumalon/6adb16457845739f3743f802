/**
 * Hund auschecken — 2-Schritt-Wizard.
 * Steps: 1) Eingecheckten Aufenthalt wählen → 2) Abreise bestätigen (Prüfen & abschließen).
 * Reads: aufenthalte (Status eingecheckt), hunde (Name über Verweis). Writes: aufenthalte.status = abgeschlossen (update).
 * Composes: IntentWizardShell, EntitySelectStep, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, formatRange } from '@/lib/journey';
import { useHundAuscheckenFlow } from '@/lib/journey/flows/HundAuschecken';
import { tx } from '@/i18n';

export default function HundAuscheckenPage() {
  const [step, setStep] = useState(1);
  const flow = useHundAuscheckenFlow({
    steps: { aufenthalte: 1 },
    items: {
      aufenthalte: (a, ctx) => {
        const unterkunft = fieldText(a, 'unterkunft');
        const zeitraum = formatRange(fieldDate(a, 'anreise'), fieldDate(a, 'abreise'), 'none');
        return {
          id: a.id,
          title: ctx.ref('hund') ?? tx('Hund ohne Namen'),
          subtitle: unterkunft ? `${unterkunft} · ${zeitraum}` : zeitraum,
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Hund auschecken')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Schließe den Aufenthalt eines Hundes bei der Abreise ab.'),
        needs: [tx('Name des Hundes')],
      }}
    >
      <WizardStep label={tx('Aufenthalt')} description={tx('Welcher Hund reist heute ab?')}>
        <EntitySelectStep
          {...flow.picks.aufenthalte.select}
          {...flow.pick('aufenthalte')}
          avatar="initials"
          searchPlaceholder={tx('Unterkunft suchen …')}
          emptyText={tx('Aktuell ist kein Hund eingecheckt.')}
        />
      </WizardStep>
      <WizardStep label={tx('Abreise bestätigen')} description={tx('Prüfe den Aufenthalt und schließe ihn ab.')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            confirmLabel={tx('Auschecken')}
            whatHappensNext={tx('Der Aufenthalt wird auf „Abgeschlossen“ gesetzt.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          title={tx('Hund ausgecheckt')}
          next={[
            { label: tx('Weiteren Hund auschecken') },
            { label: tx('Hund einchecken'), href: '#/intents/hund-einchecken' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
