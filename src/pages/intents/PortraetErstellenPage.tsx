/**
 * Aufenthaltsporträt erstellen — 3-Schritt-Wizard.
 * Steps: 1) Aufenthalt wählen → 2) Titel, Foto, Geschichte und Highlights → 3) Stimmung wählen & speichern.
 * Reads: aufenthalte (hund, anreise, abreise, status). Writes: aufenthaltsportraets (via usePortraetErstellenFlow).
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
import { fieldDate, fieldLookup, todayIso } from '@/lib/journey';
import { usePortraetErstellenFlow } from '@/lib/journey/flows/PortraetErstellen';
import { tx } from '@/i18n';

const shortDate = (iso: string | null) => (iso ? format(parseISO(iso), 'dd.MM.yyyy') : '?');

export default function PortraetErstellenPage() {
  const [step, setStep] = useState(1);
  const flow = usePortraetErstellenFlow({
    steps: { aufenthalt: 1, titel: 2, foto: 2, geschichte: 2, highlights: 2, stimmung: 3 },
    items: {
      aufenthalt: (r, ctx) => ({
        id: r.id,
        title: ctx.ref('hund') ?? tx('Ohne Hund'),
        subtitle: tx`${shortDate(fieldDate(r, 'anreise'))} – ${shortDate(fieldDate(r, 'abreise'))}`,
        status: fieldLookup(r, 'status') ?? undefined,
      }),
    },
  });
  const f = flow.forms.aufenthaltsportraets;

  return (
    <IntentWizardShell
      title={tx('Aufenthaltsporträt erstellen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Ein Porträt mit Foto und Geschichte für den Besitzer anlegen.'),
        needs: [tx('Ein Foto des Hundes'), tx('Ein paar Worte zum Aufenthalt')],
      }}
    >
      <WizardStep label={tx('Aufenthalt')} description={tx('Für welchen Aufenthalt soll das Porträt entstehen?')}>
        <EntitySelectStep
          {...flow.picks.aufenthalt.select}
          {...flow.pick('aufenthalt')}
          searchPlaceholder={tx('Unterkunft suchen …')}
        />
      </WizardStep>
      <WizardStep
        label={tx('Inhalt')}
        description={tx('Titel, Foto, Geschichte und Highlights des Aufenthalts.')}
        needs={['aufenthalt']}
      >
        <div className="space-y-4">
          <Bound form={f} name="titel" />
          <Bound form={f} name="foto" />
          <Bound form={f} name="geschichte" rows={5} />
          <Bound form={f} name="highlights" rows={3} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Stimmung')}
          />
        </div>
      </WizardStep>
      <WizardStep
        label={tx('Prüfen')}
        description={tx('Stimmung wählen und das Porträt speichern.')}
        needs={['aufenthalt', 'titel']}
      >
        <div className="space-y-6">
          <Bound form={f} name="stimmung" allowClear />
          {!flow.submit.done && (
            <SummaryStep
              forms={flow.formList}
              submit={flow.submit}
              items={[{ key: 'portraet_datum', label: tx('Datum des Porträts'), value: shortDate(todayIso()) }]}
              whatHappensNext={tx('Das Porträt wird gespeichert und ist noch nicht an den Besitzer gesendet.')}
            />
          )}
        </div>
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Hund auschecken'), href: '#/intents/auschecken' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
