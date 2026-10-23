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
import { AvailabilityRangePicker } from '@/components/blocks/AvailabilityRangePicker';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { tx } from '@/i18n';

const SLUG = 'reservierungsanfrage';

export default function Reservierungsanfrage() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return <Wizard cfg={cfg} page={page} />;
}

function Wizard({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const occupancy = useOccupancy(port, 'aufenthalte');

  const anfrage = useStepForm('reservierungsanfragen', {
    fields: [
      'wunsch_anreise', 'wunsch_abreise',
      'anfrage_firstname', 'anfrage_lastname', 'anfrage_email', 'anfrage_telefon',
      'anfrage_hundename', 'anfrage_rasse', 'nachricht',
    ],
    steps: {
      wunsch_anreise: 1, wunsch_abreise: 1,
      anfrage_firstname: 2, anfrage_lastname: 2, anfrage_email: 2, anfrage_telefon: 2,
      anfrage_hundename: 2, anfrage_rasse: 2, nachricht: 2,
    },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{ key: 'anfrage', entity: 'reservierungsanfragen', form: anfrage, primary: true }],
    { draftKey: 'reservierungsanfrage' },
  );

  const steps = [
    { label: tx('Zeitraum'), description: tx('Wähle Anreise und Abreise — belegte Nächte sind gesperrt.') },
    { label: tx('Du & dein Hund'), description: tx('Wie erreichen wir dich und wer kommt mit?') },
    { label: tx('Prüfen') },
  ];

  return (
    <PublicShell title={page.title} description={page.description}>
      <IntentWizardShell
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        back={false}
        forms={[anfrage]}
        draftKey="reservierungsanfrage"
      >
        {step === 1 && (
          <>
            <AvailabilityRangePicker
              {...anfrage.range('wunsch_anreise', 'wunsch_abreise', { blocked: occupancy.blocked })}
            />
            <StepNav
              hideBack
              onNext={() => anfrage.validate(['wunsch_anreise', 'wunsch_abreise'])}
              nextStepLabel={tx('Kontakt')}
            />
          </>
        )}
        {step === 2 && (
          <>
            <div className="space-y-4">
              <Bound form={anfrage} name="anfrage_firstname" />
              <Bound form={anfrage} name="anfrage_lastname" />
              <Bound form={anfrage} name="anfrage_email" />
              <Bound form={anfrage} name="anfrage_telefon" />
              <Bound form={anfrage} name="anfrage_hundename" />
              <Bound form={anfrage} name="anfrage_rasse" />
              <Bound form={anfrage} name="nachricht" />
            </div>
            <FieldErrorSummary forms={[anfrage]} step={2} />
            <StepNav
              onBack={() => setStep(1)}
              onNext={() =>
                anfrage.validate([
                  'anfrage_firstname', 'anfrage_lastname', 'anfrage_email',
                  'anfrage_telefon', 'anfrage_hundename', 'anfrage_rasse', 'nachricht',
                ])
              }
              nextStepLabel={tx('Prüfen')}
            />
          </>
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
            submit={submit}
            title={tx('Anfrage gesendet')}
            whatHappensNext={tx('Wir melden uns bei dir, sobald wir deine Anfrage geprüft haben.')}
          />
        )}
      </IntentWizardShell>
    </PublicShell>
  );
}
