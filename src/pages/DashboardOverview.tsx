import { useMemo, useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { IconPlus, IconInbox, IconPaw, IconStethoscope, IconPhoto, IconArrowsExchange } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
// @ts-ignore — opens the flow that owns a change
import { flowActionFor } from '@/config/plan';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { tx, dateFnsLocale } from '@/i18n';
import { gruss, namen, useClock, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { CalendarWidget, type CalendarEvent, type CalendarTone } from '@/components/widgets/CalendarWidget';

type Filter = 'all' | 'eingecheckt' | 'anreise';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { aufenthalte, reservierungsanfragen, aufenthaltsportraets, setAufenthaltsportraets, fetchAll } = data;
  const clock = useClock();
  const [filter, setFilter] = useState<Filter>('all');

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'aufenthalte') {
        const s = lookupKey(top.record.fields.status);
        const go = s === 'eingecheckt'
          ? flowActionFor('aufenthalte', 'status', top.record.record_id, 'abgeschlossen')
          : s === 'angefragt' || s === 'bestaetigt'
            ? flowActionFor('aufenthalte', 'status', top.record.record_id, 'eingecheckt')
            : null;
        if (!go) return undefined;
        return { label: s === 'eingecheckt' ? tx('Auschecken') : tx('Einchecken'), onClick: go };
      }
      if (top.type === 'reservierungsanfragen') {
        const s = lookupKey(top.record.fields.bearbeitungsstatus);
        if (s === 'angenommen' || s === 'abgelehnt') return undefined;
        const go = flowActionFor('reservierungsanfragen', 'bearbeitungsstatus', top.record.record_id, 'angenommen');
        return go ? { label: tx('Anfrage annehmen'), onClick: go } : undefined;
      }
      return undefined;
    },
  });
  const enrichedHunde = crud.enriched.hunde;
  const enrichedAufenthalte = crud.enriched.aufenthalte;
  const enrichedPortraets = crud.enriched.aufenthaltsportraets;

  const today = format(clock, 'yyyy-MM-dd');
  const inWeek = format(addDays(clock, 7), 'yyyy-MM-dd');
  const fmt = (d?: string) => (d ? format(parseISO(d), 'EEE d. MMM', { locale: dateFnsLocale() }) : '');

  const sorted = useMemo(
    () => [...enrichedAufenthalte].sort((a, b) => (a.fields.anreise ?? '').localeCompare(b.fields.anreise ?? '')),
    [enrichedAufenthalte],
  );
  const active = sorted.filter(a => lookupKey(a.fields.status) !== 'storniert');
  const eingecheckt = active.filter(a => lookupKey(a.fields.status) === 'eingecheckt');
  const kommend = active.filter(a => {
    const s = lookupKey(a.fields.status);
    return (s === 'angefragt' || s === 'bestaetigt') && (a.fields.anreise ?? '9') <= inWeek;
  });

  // Anreisen + Abreisen der nächsten 7 Tage, nach Datum
  const bewegungen = [
    ...kommend.map(a => ({ a, kind: 'an' as const, date: a.fields.anreise ?? '' })),
    ...eingecheckt
      .filter(a => (a.fields.abreise ?? '9') <= inWeek)
      .map(a => ({ a, kind: 'ab' as const, date: a.fields.abreise ?? '' })),
  ].sort((x, y) => (x.date ?? '').localeCompare(y.date ?? ''));

  const neueAnfragen = reservierungsanfragen
    .filter(r => {
      const s = lookupKey(r.fields.bearbeitungsstatus);
      return !s || s === 'neu';
    })
    .sort((a, b) => (a.createdat ?? '').localeCompare(b.createdat ?? ''));
  const anfrageName = (r: (typeof reservierungsanfragen)[number]) =>
    [r.fields.anfrage_firstname, r.fields.anfrage_lastname].filter(Boolean).join(' ') || r.fields.anfrage_hundename || tx('Interessent');

  const offenePortraets = enrichedPortraets
    .filter(p => p.fields.an_besitzer_gesendet !== true)
    .sort((a, b) => (a.fields.portraet_datum ?? '').localeCompare(b.fields.portraet_datum ?? ''));

  // Hunde mit aktivem/anstehendem Aufenthalt, aber ohne aktuellen Impfschutz
  const impfIds = new Set(
    active
      .filter(a => ['angefragt', 'bestaetigt', 'eingecheckt'].includes(lookupKey(a.fields.status) ?? ''))
      .map(a => extractRecordId(a.fields.hund))
      .filter((x): x is string => !!x),
  );
  const impfLuecken = enrichedHunde.filter(h => impfIds.has(h.record_id) && h.fields.impfung_aktuell !== true);

  const filteredStays = filter === 'eingecheckt' ? eingecheckt : filter === 'anreise' ? kommend : active;
  const events: CalendarEvent[] = filteredStays
    .filter(a => !!a.fields.anreise)
    .map(a => {
      const s = lookupKey(a.fields.status);
      const tone: CalendarTone = s === 'eingecheckt' ? 'success' : s === 'angefragt' ? 'warning' : s === 'abgeschlossen' ? 'default' : 'primary';
      return {
        id: `aufenthalt:${a.record_id}`,
        start: a.fields.anreise!,
        end: a.fields.abreise,
        allDay: true,
        title: a.hundName || tx('Ohne Hund'),
        subtitle: a.fields.unterkunft,
        tone,
      };
    });

  const markGesendet = (id: string) => {
    const prev = aufenthaltsportraets;
    setAufenthaltsportraets(list => list.map(p => (p.record_id === id ? { ...p, fields: { ...p.fields, an_besitzer_gesendet: true } } : p)));
    LivingAppsService.updateAufenthaltsportraet(id, { an_besitzer_gesendet: true }).catch(() => void fetchAll());
    undoToast(tx('Porträt als gesendet markiert'), () => {
      setAufenthaltsportraets(prev);
      LivingAppsService.updateAufenthaltsportraet(id, { an_besitzer_gesendet: false }).catch(() => void fetchAll());
    });
  };

  // Kontextzeile — nennt in jedem Zweig Namen
  const heuteAn = kommend.filter(a => a.fields.anreise === today).map(a => a.hundName);
  const heuteAb = eingecheckt.filter(a => a.fields.abreise === today).map(a => a.hundName);
  let context: string;
  if (heuteAn.length > 0 && heuteAb.length > 0) context = tx`Heute kommen ${namen(heuteAn)} an — ${namen(heuteAb)} reist ab.`;
  else if (heuteAn.length > 0) context = tx`Heute kommen ${namen(heuteAn)} an.`;
  else if (heuteAb.length > 0) context = tx`Heute reist ${namen(heuteAb)} ab.`;
  else if (eingecheckt.length > 0) context = tx`Zu Gast sind gerade ${namen(eingecheckt.map(a => a.hundName), 3)}.`;
  else if (kommend.length > 0) context = tx`Als Nächstes kommt ${namen(kommend.map(a => a.hundName))} am ${fmt(kommend[0].fields.anreise)}.`;
  else context = tx`Gerade ist es ruhig im Haus — Zeit, neue Gäste einzuplanen.`;

  const firstNew = neueAnfragen[0];
  const goFirstNew = firstNew
    ? flowActionFor('reservierungsanfragen', 'bearbeitungsstatus', firstNew.record_id, 'angenommen') ?? (() => crud.reservierungsanfragen.openDetail(firstNew))
    : undefined;

  const empty = aufenthalte.length === 0 && enrichedHunde.length === 0 && reservierungsanfragen.length === 0;

  const hero = empty ? (
    <HeroBanner
      tone="primary"
      icon={<IconPaw size={48} />}
      action={{ label: tx('Ersten Hund aufnehmen'), onClick: () => crud.hunde.openCreate({}) }}
    >
      {tx('Richte deine Pension ein — lege zuerst einen Hund mit Besitzer an.')}
    </HeroBanner>
  ) : firstNew && goFirstNew ? (
    <HeroBanner
      icon={<IconInbox size={18} />}
      action={{ label: tx('Anfrage prüfen'), onClick: goFirstNew }}
    >
      <b>{namen(neueAnfragen.map(anfrageName), 3)}</b>{' '}
      {neueAnfragen.length === 1
        ? tx`hat eine neue Reservierungsanfrage gestellt (${fmt(firstNew.fields.wunsch_anreise)}).`
        : tx`warten auf eine Antwort — älteste Anfrage für ${fmt(firstNew.fields.wunsch_anreise)}.`}
    </HeroBanner>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.aufenthalte.canWrite && (
          <Button onClick={() => crud.aufenthalte.openCreate({ status: 'bestaetigt' })} className="w-full sm:w-auto">
            <IconPlus size={16} className="shrink-0" />
            {tx('Aufenthalt planen')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Eingecheckt')}
              value={eingecheckt.length}
              icon={<IconPaw size={16} className="text-muted-foreground" />}
              tone={eingecheckt.length > 0 ? 'success' : 'default'}
              onClick={() => setFilter(f => (f === 'eingecheckt' ? 'all' : 'eingecheckt'))}
              active={filter === 'eingecheckt'}
            />
            <StatStripItem
              title={tx('Anreisen (7 Tage)')}
              value={kommend.length}
              icon={<IconArrowsExchange size={16} className="text-muted-foreground" />}
              onClick={() => setFilter(f => (f === 'anreise' ? 'all' : 'anreise'))}
              active={filter === 'anreise'}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={events}
            defaultView="month"
            locale={dateFnsLocale()}
            onEventClick={ev => {
              const rec = aufenthalte.find(a => a.record_id === ev.id.split(':')[1]);
              if (rec) crud.aufenthalte.openDetail(rec);
            }}
            onRangeCreate={
              crud.aufenthalte.canWrite
                ? (start, end) =>
                    crud.aufenthalte.openCreate({
                      anreise: format(start, 'yyyy-MM-dd'),
                      abreise: format(end, 'yyyy-MM-dd'),
                      status: 'bestaetigt',
                    })
                : undefined
            }
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Anreisen & Abreisen')}
              icon={<IconArrowsExchange size={16} />}
              items={bewegungen.map(({ a, kind, date }) => {
                const go = flowActionFor('aufenthalte', 'status', a.record_id, kind === 'an' ? 'eingecheckt' : 'abgeschlossen');
                return {
                  id: `${kind}:${a.record_id}`,
                  title: a.hundName || tx('Ohne Hund'),
                  secondLine: (
                    <>
                      <span className={`font-medium ${date <= today ? 'text-destructive' : 'text-foreground'}`}>
                        {kind === 'an' ? tx('Anreise') : tx('Abreise')}
                      </span>
                      <span className="text-muted-foreground"> · {date === today ? tx('heute') : fmt(date)}</span>
                    </>
                  ),
                  action: go ? { label: kind === 'an' ? tx('Einchecken') : tx('Auschecken'), onClick: go } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = aufenthalte.find(a => a.record_id === id.split(':')[1]);
                if (rec) crud.aufenthalte.openDetail(rec);
              }}
              empty={{
                text: tx('Keine Anreisen oder Abreisen in den nächsten 7 Tagen.'),
                action: crud.aufenthalte.canWrite ? { label: tx('Aufenthalt planen'), onClick: () => crud.aufenthalte.openCreate({ status: 'bestaetigt' }) } : undefined,
              }}
            />
            <WorkList
              title={tx('Porträts noch nicht gesendet')}
              icon={<IconPhoto size={16} />}
              items={offenePortraets.map(p => ({
                id: p.record_id,
                title: p.fields.titel || p.aufenthaltName || tx('Porträt'),
                secondLine: <span className="text-muted-foreground">{p.aufenthaltName}{p.fields.portraet_datum ? ` · ${fmt(p.fields.portraet_datum)}` : ''}</span>,
                action: { label: tx('Als gesendet'), onClick: () => markGesendet(p.record_id) },
              }))}
              onItemClick={id => {
                const rec = aufenthaltsportraets.find(p => p.record_id === id);
                if (rec) crud.aufenthaltsportraets.openDetail(rec);
              }}
              empty={{
                text: tx('Alle Porträts sind bei den Besitzern.'),
                action: crud.aufenthaltsportraets.canWrite ? { label: tx('Porträt erstellen'), onClick: () => crud.aufenthaltsportraets.openCreate({}) } : undefined,
              }}
            />
            <WorkList
              title={tx('Impfschutz prüfen')}
              icon={<IconStethoscope size={16} />}
              items={impfLuecken.map(h => ({
                id: h.record_id,
                title: h.fields.hundename || tx('Hund'),
                secondLine: (
                  <>
                    <span className="font-medium text-destructive">{tx('Impfschutz nicht aktuell')}</span>
                    <span className="text-muted-foreground"> · {h.besitzerName}</span>
                  </>
                ),
                action: crud.hunde.canWrite ? { label: tx('Bearbeiten'), onClick: () => crud.hunde.openEdit(h) } : undefined,
              }))}
              onItemClick={id => {
                const rec = enrichedHunde.find(h => h.record_id === id);
                if (rec) crud.hunde.openDetail(rec);
              }}
              empty={{ text: tx('Alle Gäste haben einen aktuellen Impfschutz.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
