import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { useStepForm, useJourneySubmit, useOccupancy } from '@/lib/journey';
import { createPublicPort } from '@/lib/journey/publicPort';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { tx } from '@/i18n';

function Wizard({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const occupancy = useOccupancy(port, 'aufenthalte');

  const anfrage = useStepForm('reservierungsanfragen', {
    fields: [
      'wunsch_anreise',
      'wunsch_abreise',
      'anfrage_firstname',
      'anfrage_lastname',
      'anfrage_email',
      'anfrage_telefon',
      'anfrage_hundename',
      'anfrage_rasse',
      'nachricht',
    ],
    autoComplete: true,
    steps: {
      wunsch_anreise: 1,
      wunsch_abreise: 1,
      anfrage_firstname: 2,
      anfrage_lastname: 2,
      anfrage_email: 2,
      anfrage_telefon: 2,
      anfrage_hundename: 2,
      anfrage_rasse: 2,
      nachricht: 2,
    },
  });

  const submit = useJourneySubmit(
    port,
    [{ key: 'anfrage', entity: 'reservierungsanfragen', form: anfrage, primary: true }],
    { draftKey: 'reservierungsanfrage' },
  );

  const steps = [
    { label: tx('Zeitraum') },
    { label: tx('Kontakt & Hund') },
    { label: tx('Prüfen') },
  ];

  const restart = () => {
    submit.reset();
    anfrage.reset();
    setStep(1);
  };

  return (
    <IntentWizardShell
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[anfrage]}
      draftKey="reservierungsanfrage"
    >
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tx('Durchgestrichene Nächte sind bereits belegt. Wähle deinen Wunschzeitraum aus den freien Tagen.')}
          </p>
          <AvailabilityRangePicker {...anfrage.range('wunsch_anreise', 'wunsch_abreise', { blocked: occupancy.blocked })} />
          <StepNav
            hideBack
            onNext={() => anfrage.validate(['wunsch_anreise', 'wunsch_abreise'])}
            nextStepLabel={tx('Kontakt & Hund')}
          />
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={anfrage} name="anfrage_firstname" />
            <Bound form={anfrage} name="anfrage_lastname" />
          </div>
          <Bound form={anfrage} name="anfrage_email" />
          <Bound form={anfrage} name="anfrage_telefon" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={anfrage} name="anfrage_hundename" />
            <Bound form={anfrage} name="anfrage_rasse" />
          </div>
          <Bound form={anfrage} name="nachricht" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() =>
              anfrage.validate([
                'anfrage_firstname',
                'anfrage_lastname',
                'anfrage_email',
                'anfrage_telefon',
                'anfrage_hundename',
                'anfrage_rasse',
                'nachricht',
              ])
            }
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      )}
      {step === 3 && !submit.done && (
        <SummaryStep
          forms={[anfrage]}
          submit={submit}
          whatHappensNext={tx('Wir prüfen deine Anfrage und melden uns per E-Mail oder Telefon bei dir.')}
        />
      )}
      {submit.result && (
        <SuccessStep
          result={submit.result}
          forms={[anfrage]}
          title={tx('Anfrage gesendet')}
          whatHappensNext={tx('Wir prüfen deine Anfrage und melden uns bei dir.')}
          next={[{ label: tx('Weitere Anfrage'), onClick: restart }]}
        />
      )}
    </IntentWizardShell>
  );
}

export default function Reservierungsanfrage() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig('reservierungsanfrage')
      .then(c => {
        setCfg(c);
        setPage(c?.pages['reservierungsanfrage'] ?? null);
      })
      .catch(() => {
        setCfg(null);
        setPage(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }

  return (
    <PublicShell
      title={tx('Reservierungsanfrage')}
      description={tx('Sieh, welche Zeiträume frei sind, und frag deinen Wunschzeitraum für deinen Hund an.')}
    >
      <Wizard cfg={cfg} page={page} />
    </PublicShell>
  );
}
