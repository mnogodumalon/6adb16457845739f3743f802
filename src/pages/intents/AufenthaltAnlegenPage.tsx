/**
 * Aufenthalt anlegen — 4-Schritt-Wizard.
 * Steps: 1) Besitzer wählen oder neu anlegen → 2) Hund wählen oder neu anlegen → 3) Zeitraum und Unterkunft
 *        → 4) Preis eintragen & Aufenthalt bestätigen.
 * Reads: besitzer, hunde, aufenthalte (Belegung). Writes: besitzer/hunde (nur bei Neuanlage), aufenthalte.
 * Composes: IntentWizardShell, EntitySelectStep, AvailabilityRangePicker, Bound, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, useOccupancy } from '@/lib/journey';
import { useAufenthaltAnlegenFlow } from '@/lib/journey/flows/AufenthaltAnlegen';
import { tx } from '@/i18n';

export default function AufenthaltAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useAufenthaltAnlegenFlow({
    steps: {
      besitzer: 1, besitzer_firstname: 1, besitzer_lastname: 1, email: 1, telefon: 1,
      hund: 2, hundename: 2, rasse: 2, impfung_aktuell: 2,
      anreise: 3, abreise: 3, unterkunft: 3,
      preis_pro_tag: 4, besonderheiten: 4,
    },
    items: {
      besitzer: r => ({
        id: r.id,
        title: `${fieldText(r, 'besitzer_firstname')} ${fieldText(r, 'besitzer_lastname')}`.trim(),
        subtitle: fieldText(r, 'ort'),
      }),
      hund: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'hundename'),
        subtitle: ctx.ref('besitzer'),
      }),
    },
  });

  const aufenthalt = flow.forms.aufenthalte;
  const belegung = useOccupancy(flow.port, 'aufenthalte');

  return (
    <IntentWizardShell
      title={tx('Aufenthalt anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Plane einen neuen Aufenthalt und prüfe direkt, ob die Unterkunft frei ist.'),
        needs: [tx('Name des Besitzers'), tx('Name des Hundes'), tx('Anreise- und Abreisedatum')],
      }}
    >
      <WizardStep label={tx('Besitzer')} description={tx('Wähle den Besitzer aus oder lege einen neuen an.')}>
        <EntitySelectStep
          {...flow.picks.besitzer.select}
          {...flow.pick('besitzer')}
          avatar="initials"
          searchPlaceholder={tx('Name suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Hund')} description={tx('Wähle den Hund aus oder lege einen neuen an.')}>
        <EntitySelectStep
          {...flow.picks.hund.select}
          {...flow.pick('hund')}
          avatar="initials"
          searchPlaceholder={tx('Hundename suchen …')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Zeitraum')}
        heading={tx('Zeitraum und Unterkunft')}
        description={tx('An- und Abreise wählen — belegte Nächte sind ausgegraut.')}
      >
        <div className="space-y-4">
          <AvailabilityRangePicker {...aufenthalt.range('anreise', 'abreise', { blocked: belegung.blocked })} />
          <Bound form={aufenthalt} name="unterkunft" hint={tx('z. B. Zimmer 3 oder Außenzwinger')} />
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Preis')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')} heading={tx('Preis und Bestätigung')} description={tx('Trage den Preis pro Tag ein und bestätige den Aufenthalt.')}>
        {!flow.submit.done && (
          <div className="space-y-4">
            <Bound form={aufenthalt} name="preis_pro_tag" />
            <Bound form={aufenthalt} name="besonderheiten" rows={3} />
            <SummaryStep
              forms={flow.formList}
              submit={flow.submit}
              items={[{ key: 'status', label: tx('Status'), value: tx('Bestätigt') }]}
              whatHappensNext={tx('Der Aufenthalt wird als bestätigt angelegt. Neue Besitzer und Hunde werden mit angelegt.')}
            />
          </div>
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Porträt erstellen'), href: '#/intents/portraet-erstellen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
