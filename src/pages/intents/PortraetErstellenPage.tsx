/**
 * Porträt erstellen — 6-Schritt-Wizard.
 * Steps: 1) Aufenthalt wählen → 2) Titel → 3) Foto → 4) Geschichte und Highlights → 5) Stimmung → 6) Prüfen & speichern.
 * Reads: aufenthalte (eingecheckt/abgeschlossen), hunde (Namen). Writes: aufenthaltsportraets (via usePortraetErstellenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, Field, ChoiceGroup, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup } from '@/lib/journey';
import { usePortraetErstellenFlow } from '@/lib/journey/flows/PortraetErstellen';
import { tx } from '@/i18n';

function shortDate(iso: string | null): string {
  return iso ? format(parseISO(iso), 'dd.MM.yyyy') : '?';
}

export default function PortraetErstellenPage() {
  const [step, setStep] = useState(1);
  const flow = usePortraetErstellenFlow({
    steps: { aufenthalt: 1, titel: 2, foto: 3, geschichte: 4, highlights: 4, stimmung: 5 },
    items: {
      aufenthalt: (r, ctx) => {
        const status = fieldLookup(r, 'status');
        return {
          id: r.id,
          title: ctx.ref('hund') ?? tx('Hund unbekannt'),
          subtitle: `${fieldText(r, 'unterkunft') || tx('Ohne Unterkunft')} · ${shortDate(fieldDate(r, 'anreise'))} – ${shortDate(fieldDate(r, 'abreise'))}`,
          status: status ?? undefined,
        };
      },
    },
  });
  const f = flow.forms.aufenthaltsportraets;
  const primary = flow.submit.result?.primary;
  const foto = primary ? fieldText(primary, 'foto') : '';

  return (
    <IntentWizardShell
      title={tx('Porträt erstellen')}
      currentStep={step} onStepChange={setStep}
      forms={flow.formList} draftKey={flow.draftKey}
      intro={{ description: tx('Foto, Geschichte und Highlights eines Aufenthalts als Porträt festhalten.'), needs: [tx('Ein eingecheckter oder abgeschlossener Aufenthalt'), tx('Ein Foto des Hundes')] }}
    >
      <WizardStep label={tx('Aufenthalt')} description={tx('Für welchen laufenden oder abgeschlossenen Aufenthalt entsteht das Porträt?')}>
        <EntitySelectStep {...flow.picks.aufenthalt.select} {...flow.pick('aufenthalt')}
          searchPlaceholder={tx('Unterkunft suchen …')}
          emptyText={tx('Kein Aufenthalt ist eingecheckt oder abgeschlossen.')} />
      </WizardStep>
      <WizardStep label={tx('Titel')} description={tx('Gib dem Porträt einen Titel.')} needs={['aufenthalt']}>
        <Bound form={f} name="titel" />
        <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Foto')} />
      </WizardStep>
      <WizardStep label={tx('Foto')} description={tx('Lade ein Foto des Hundes hoch.')}>
        <Bound form={f} name="foto" />
        <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Geschichte')} />
      </WizardStep>
      <WizardStep label={tx('Geschichte')} heading={tx('Geschichte und Highlights')} description={tx('Erzähle, wie der Aufenthalt war, und halte die schönsten Momente fest.')}>
        <div className="space-y-4">
          <Bound form={f} name="geschichte" rows={5} />
          <Bound form={f} name="highlights" rows={4} />
        </div>
        <StepNav onBack={() => setStep(3)} onNext={() => flow.validateStep(4)} nextStepLabel={tx('Stimmung')} />
      </WizardStep>
      <WizardStep label={tx('Stimmung')} description={tx('Welche Stimmung passt am besten zum Aufenthalt?')}>
        <Field form={f} name="stimmung"><ChoiceGroup {...f.choice('stimmung')} allowClear /></Field>
        <StepNav onBack={() => setStep(4)} onNext={() => flow.validateStep(5)} nextStepLabel={tx('Prüfen')} />
      </WizardStep>
      <WizardStep label={tx('Prüfen')} description={tx('Alles richtig? Dann speichere das Porträt.')}>
        {!flow.submit.done && (
          <SummaryStep forms={flow.formList} submit={flow.submit}
            items={[
              { key: 'portraet_datum', label: tx('Datum des Porträts'), value: tx('Heute') },
              { key: 'an_besitzer_gesendet', label: tx('An Besitzer gesendet'), value: tx('Nein') },
            ]}
            whatHappensNext={tx('Das Porträt wird gespeichert und ist noch nicht an den Besitzer gesendet.')} />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit}
          next={[{ label: tx('Zum Dashboard'), href: '#/' }]}
          whatHappensNext={tx('Das Porträt ist gespeichert.')}>
          {primary && (
            <div className="space-y-3 rounded-2xl bg-card p-4 text-left shadow-lg">
              <h3 className="text-lg font-semibold text-foreground">{fieldText(primary, 'titel')}</h3>
              {foto && <img src={foto} alt={fieldText(primary, 'titel')} className="max-h-72 w-full rounded-xl object-cover" />}
              {fieldText(primary, 'geschichte') && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{fieldText(primary, 'geschichte')}</p>
              )}
            </div>
          )}
        </SuccessStep>
      )}
    </IntentWizardShell>
  );
}
