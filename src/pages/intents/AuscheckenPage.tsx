/**
 * Hund auschecken — 3-Schritt-Wizard.
 * Steps: 1) Eingecheckten Aufenthalt wählen → 2) Interne Notizen ergänzen → 3) Aufenthalt abschließen.
 * Reads: aufenthalte (hund-Namen via Referenz). Writes: aufenthalte (Notizen + Status „abgeschlossen", über useAuscheckenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldLookup, fieldText } from '@/lib/journey';
import { useAuscheckenFlow } from '@/lib/journey/flows/Auschecken';
import { optionsOf } from '@/lib/journey';
import { tx } from '@/i18n';

function day(iso: string | null): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy') : '?';
}

export default function AuscheckenPage() {
  const [step, setStep] = useState(1);
  const flow = useAuscheckenFlow({
    steps: { aufenthalte: 1, interne_notizen: 2 },
    items: {
      aufenthalte: (r, ctx) => ({
        id: r.id,
        title: ctx.ref('hund') ?? tx('Ohne Hund'),
        subtitle: [fieldText(r, 'unterkunft'), `${day(fieldDate(r, 'anreise'))} – ${day(fieldDate(r, 'abreise'))}`]
          .filter(Boolean)
          .join(' · '),
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });

  const doneLabel = optionsOf('aufenthalte', 'status').find(o => o.key === 'abgeschlossen')?.label ?? '';

  return (
    <IntentWizardShell
      title={tx('Hund auschecken')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen eingecheckten Aufenthalt bei der Abholung abschließen.'),
        needs: [tx('Der Hund ist eingecheckt'), tx('Optional: interne Notizen zur Abholung')],
      }}
    >
      <WizardStep label={tx('Aufenthalt')} description={tx('Welcher Hund wird gerade abgeholt?')}>
        <EntitySelectStep
          {...flow.picks.aufenthalte.select}
          {...flow.pick('aufenthalte')}
          searchPlaceholder={tx('Unterkunft suchen …')}
          emptyText={tx('Zurzeit ist kein Hund eingecheckt.')}
        />
      </WizardStep>
      <WizardStep
        label={tx('Notizen')}
        description={tx('Halte fest, was bei der Abholung wichtig war.')}
        needs={['aufenthalte']}
      >
        <div className="space-y-4">
          <Bound form={flow.forms.aufenthalte} name="interne_notizen" rows={5} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Abschließen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Neuer Status'), value: doneLabel }]}
            whatHappensNext={tx('Der Aufenthalt wird als abgeschlossen markiert.')}
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
            { label: tx('Aufenthaltsporträt erstellen'), href: '#/intents/portraet-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Zur Erinnerung kannst du jetzt ein Aufenthaltsporträt anlegen.')}
        />
      )}
    </IntentWizardShell>
  );
}
