/**
 * Hund einchecken — 3-Schritt-Wizard.
 * Steps: 1) Bestätigten Aufenthalt wählen → 2) Impfschutz und Hinweise des Hundes ansehen → 3) Einchecken bestätigen.
 * Reads: aufenthalte, hunde. Writes: aufenthalte (status → eingecheckt, via useHundEincheckenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldRef } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useHundEincheckenFlow } from '@/lib/journey/flows/HundEinchecken';
import { formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';

export default function HundEincheckenPage() {
  const [step, setStep] = useState(1);
  const [hund, setHund] = useState<JourneyRecord | null>(null);
  const [hundLoading, setHundLoading] = useState(false);

  const flow = useHundEincheckenFlow({
    steps: { aufenthalte: 1 },
    items: {
      aufenthalte: (r, ctx) => {
        const an = fieldDate(r, 'anreise');
        const ab = fieldDate(r, 'abreise');
        return {
          id: r.id,
          title: ctx.ref('hund') ?? tx('Hund ohne Namen'),
          subtitle: [an ? formatDate(an) : '', ab ? formatDate(ab) : ''].filter(Boolean).join(' – ')
            + (fieldText(r, 'unterkunft') ? ` · ${fieldText(r, 'unterkunft')}` : ''),
        };
      },
    },
  });

  const stay = flow.targets.aufenthalte?.record ?? null;
  const hundId = stay ? fieldRef(stay, 'hund') : null;

  useEffect(() => {
    let cancelled = false;
    if (!hundId) {
      setHund(null);
      return;
    }
    setHundLoading(true);
    flow.port.get('hunde', hundId).then(r => {
      if (!cancelled) {
        setHund(r);
        setHundLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setHundLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hundId]);

  const impfung = hund?.fields.impfung_aktuell === true;
  const notes: Array<{ key: string; label: string; value: string }> = hund ? [
    { key: 'futter', label: tx('Futterhinweise'), value: fieldText(hund, 'futterhinweise') },
    { key: 'medikamente', label: tx('Medikamente'), value: fieldText(hund, 'medikamente') },
    { key: 'vertraeglichkeit', label: tx('Verträglichkeit und Besonderheiten'), value: fieldText(hund, 'vertraeglichkeit') },
  ] : [];

  return (
    <IntentWizardShell
      title={tx('Hund einchecken')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen bestätigten Aufenthalt bei Anreise auf Eingecheckt setzen.'),
        needs: [tx('Bestätigter Aufenthalt')],
      }}
    >
      <WizardStep label={tx('Aufenthalt')} description={tx('Welcher bestätigte Aufenthalt beginnt jetzt?')}>
        <EntitySelectStep
          {...flow.picks.aufenthalte.select}
          {...flow.pick('aufenthalte')}
          avatar="none"
          searchPlaceholder={tx('Unterkunft suchen …')}
          emptyText={tx('Es gibt keinen bestätigten Aufenthalt. Bestätige zuerst eine Reservierung.')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Hund prüfen')}
        description={tx('Impfschutz und Hinweise des Hundes kurz durchgehen.')}
        needs={['aufenthalte']}
      >
        <div className="space-y-4">
          {hundLoading && <p className="text-sm text-muted-foreground">{tx('Lade Angaben zum Hund …')}</p>}
          {!hundLoading && !hund && (
            <p className="text-sm text-muted-foreground">{tx('Zu diesem Aufenthalt ist kein Hund hinterlegt.')}</p>
          )}
          {hund && (
            <div className="rounded-2xl bg-card shadow-lg overflow-hidden p-4 space-y-4">
              <h3 className="text-lg font-semibold truncate">{fieldText(hund, 'hundename')}</h3>
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
                  impfung ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'
                }`}
              >
                {impfung
                  ? <IconCircleCheck size={18} className="shrink-0" />
                  : <IconAlertTriangle size={18} className="shrink-0" />}
                <span>{impfung ? tx('Impfschutz ist aktuell.') : tx('Impfschutz ist nicht als aktuell vermerkt — bitte Impfpass prüfen.')}</span>
              </div>
              <dl className="space-y-3">
                {notes.map(n => (
                  <div key={n.key} className="min-w-0">
                    <dt className="text-xs font-medium text-muted-foreground">{n.label}</dt>
                    <dd className="text-sm whitespace-pre-wrap break-words">{n.value || tx('Keine Angaben')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <StepNav onBack={() => setStep(1)} onNext={() => true} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Neuer Status'), value: tx('Eingecheckt') }]}
            whatHappensNext={tx('Der Aufenthalt steht danach auf Eingecheckt.')}
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
            { label: tx('Nächsten Hund einchecken'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Hund auschecken'), href: '#/intents/hund-auschecken' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
