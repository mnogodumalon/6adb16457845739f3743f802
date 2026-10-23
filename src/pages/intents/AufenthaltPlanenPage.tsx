/**
 * Aufenthalt planen — 4-Schritt-Wizard.
 * Steps: 1) Hund wählen → 2) Anreise/Abreise → 3) Unterkunft, Preis, Besonderheiten (mit Überschneidungsprüfung) → 4) Prüfen & speichern.
 * Reads: hunde, aufenthalte (Belegungszähler). Writes: aufenthalte (Status fest „Bestätigt").
 * Composes: IntentWizardShell, EntitySelectStep, AvailabilityRangePicker, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldLookup, useRecordCount } from '@/lib/journey';
import { useAufenthaltPlanenFlow } from '@/lib/journey/flows/AufenthaltPlanen';
import { tx } from '@/i18n';

const FREE_STATUS = ['angefragt', 'abgeschlossen', 'storniert'];

export default function AufenthaltPlanenPage() {
  const [step, setStep] = useState(1);
  const flow = useAufenthaltPlanenFlow({
    steps: { hund: 1, anreise: 2, abreise: 2, unterkunft: 3, preis_pro_tag: 3, besonderheiten: 3 },
    items: {
      hund: r => ({
        id: r.id,
        title: fieldText(r, 'hundename'),
        subtitle: [fieldText(r, 'rasse'), r.fields.impfung_aktuell === true ? tx('Impfschutz aktuell') : '']
          .filter(Boolean).join(' · ') || undefined,
      }),
    },
  });
  const f = flow.forms.aufenthalte;

  const from = (f.get('anreise') as string | null) || '';
  const to = (f.get('abreise') as string | null) || '';
  const unterkunft = ((f.get('unterkunft') as string | null) || '').trim();
  const checkable = Boolean(from && to && unterkunft);
  const safeUnterkunft = unterkunft.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const overlaps = useRecordCount(flow.port, 'aufenthalte', {
    filter: checkable
      ? `r.v_unterkunft == '${safeUnterkunft}' and r.v_anreise < @(${to}) and r.v_abreise > @(${from}) and not (r.v_status in ['angefragt', 'abgeschlossen', 'storniert'])`
      : undefined,
    where: r => {
      const a = fieldDate(r, 'anreise');
      const b = fieldDate(r, 'abreise');
      const s = fieldLookup(r, 'status')?.key ?? '';
      return fieldText(r, 'unterkunft') === unterkunft && !!a && !!b && a < to && b > from && !FREE_STATUS.includes(s);
    },
    enabled: checkable,
  });
  const occupied = (overlaps.count ?? 0) > 0;
  const overlapMessage = tx('Diese Unterkunft ist im gewählten Zeitraum bereits belegt.');

  return (
    <IntentWizardShell
      title={tx('Aufenthalt planen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen bestätigten Aufenthalt für einen Hund anlegen.'),
        needs: [tx('Name des Hundes'), tx('Anreise und Abreise'), tx('Unterkunft')],
      }}
    >
      <WizardStep label={tx('Hund')} description={tx('Für welchen Hund planst du den Aufenthalt?')}>
        <EntitySelectStep
          {...flow.picks.hund.select}
          {...flow.pick('hund')}
          avatar="initials"
          searchPlaceholder={tx('Name oder Rasse …')}
        />
      </WizardStep>

      <WizardStep label={tx('Zeitraum')} description={tx('Anreise und Abreise wählen.')} needs={['hund']}>
        <div className="space-y-4">
          <AvailabilityRangePicker {...f.range('anreise', 'abreise', { blocked: [] })} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Unterkunft')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Unterkunft')}
        description={tx('Wo schläft der Hund und was kostet es pro Tag?')}
        needs={['anreise', 'abreise']}
      >
        <div className="space-y-4">
          <Bound form={f} name="unterkunft" placeholder={tx('z. B. Zimmer 3')} />
          <Bound form={f} name="preis_pro_tag" />
          <Bound form={f} name="besonderheiten" rows={3} />
          {occupied && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{overlapMessage}</span>
            </div>
          )}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => {
              if (!flow.validateStep(3)) return false;
              if (overlaps.loading) return tx('Die Belegung wird noch geprüft — einen Moment bitte.');
              if (occupied) return overlapMessage;
              return true;
            }}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')} description={tx('Alles richtig? Dann speichern.')}>
        {!flow.submit.done && (
          <div className="space-y-4">
            {occupied && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{overlapMessage}</span>
              </div>
            )}
            <SummaryStep
              forms={flow.formList}
              submit={flow.submit}
              items={[{ key: 'status', label: tx('Status'), value: tx('Bestätigt') }]}
              whatHappensNext={tx('Der Aufenthalt erscheint sofort als bestätigt im Belegungsplan.')}
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
            { label: tx('Hund einchecken'), href: '#/intents/hund-einchecken' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Bei der Anreise nutzt du den Ablauf „Hund einchecken".')}
        />
      )}
    </IntentWizardShell>
  );
}
