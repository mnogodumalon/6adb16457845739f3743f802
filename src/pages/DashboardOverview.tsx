import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor } from '@/config/plan';
import type { EnrichedAufenthalte } from '@/types/enriched';
import { LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { gruss, namen, undoToast, useClock } from '@/lib/polish';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';

// Komposition: Hero = Hunde ohne Impfschutz bei aktiven Aufenthalten (nichts sonst wiederholt das).
// wide + StatStrip, Kanban (Status) als Primary; Aside-Band: Anfragen, An-/Abreisen, offene Porträts.
// Mobil: Kanban paginiert seine Spalten selbst, Listen stehen davor.
type Focus = 'all' | 'anreise' | 'abreise';

const FLOW_OWNED = ['eingecheckt', 'abgeschlossen'];

function toneFor(status: string): KanbanTone {
  if (status === 'eingecheckt') return 'success';
  if (status === 'bestaetigt') return 'primary';
  if (status === 'angefragt') return 'warning';
  return 'default';
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    hunde, aufenthalte, aufenthaltsportraets, reservierungsanfragen,
    setAufenthalte, setAufenthaltsportraets, fetchAll,
  } = data;
  const clock = useClock();
  const [focus, setFocus] = useState<Focus>('all');

  const crud = useEntityCrud(data, {
    footer: (top) => (top.type === 'aufenthalte' ? advanceAction(top.record) : undefined),
  });
  const enrichedAufenthalte = crud.enriched.aufenthalte;
  const enrichedPortraets = crud.enriched.aufenthaltsportraets;

  const todayKey = format(clock, 'yyyy-MM-dd');
  const weekKey = format(addDays(clock, 7), 'yyyy-MM-dd');

  const statusOf = (a: EnrichedAufenthalte) => lookupKey(a.fields.status) ?? '';

  // EIN Helper für Overlay-Footer und Listen-Aktionen
  function advanceAction(a: EnrichedAufenthalte): { label: string; onClick: () => void } | undefined {
    const s = lookupKey(a.fields.status);
    if (s === 'angefragt') {
      const rec = aufenthalte.find(r => r.record_id === a.record_id);
      return rec ? { label: tx('Bestätigen'), onClick: () => crud.aufenthalte.openEdit(rec) } : undefined;
    }
    if (s === 'bestaetigt') {
      const go = flowActionFor('aufenthalte', 'status', a.record_id, 'eingecheckt');
      return go ? { label: tx('Einchecken'), onClick: go } : undefined;
    }
    if (s === 'eingecheckt') {
      const go = flowActionFor('aufenthalte', 'status', a.record_id, 'abgeschlossen');
      return go ? { label: tx('Auschecken'), onClick: go } : undefined;
    }
    return undefined;
  }

  const eingecheckt = useMemo(
    () => enrichedAufenthalte.filter(a => lookupKey(a.fields.status) === 'eingecheckt'),
    [enrichedAufenthalte],
  );
  const anreisen = useMemo(
    () => enrichedAufenthalte
      .filter(a => ['angefragt', 'bestaetigt'].includes(lookupKey(a.fields.status) ?? '')
        && (a.fields.anreise ?? '') >= todayKey && (a.fields.anreise ?? '') <= weekKey)
      .sort((x, y) => (x.fields.anreise ?? '').localeCompare(y.fields.anreise ?? '')),
    [enrichedAufenthalte, todayKey, weekKey],
  );
  const abreisen = useMemo(
    () => enrichedAufenthalte
      .filter(a => lookupKey(a.fields.status) === 'eingecheckt' && (a.fields.abreise ?? '') <= weekKey)
      .sort((x, y) => (x.fields.abreise ?? '').localeCompare(y.fields.abreise ?? '')),
    [enrichedAufenthalte, weekKey],
  );

  // Hero: aktive Aufenthalte, deren Hund keinen aktuellen Impfschutz hat
  const ohneImpfung = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const a of enrichedAufenthalte) {
      const s = lookupKey(a.fields.status) ?? '';
      if (!['angefragt', 'bestaetigt', 'eingecheckt'].includes(s)) continue;
      if ((a.fields.abreise ?? '') < todayKey) continue;
      const id = extractRecordId(a.fields.hund);
      if (!id || seen.has(id)) continue;
      const h = hunde.find(x => x.record_id === id);
      if (h && h.fields.impfung_aktuell !== true) {
        seen.add(id);
        out.push({ id, name: h.fields.hundename ?? a.hundName });
      }
    }
    return out;
  }, [enrichedAufenthalte, hunde, todayKey]);

  const offeneAnfragen = useMemo(
    () => reservierungsanfragen
      .filter(r => ['neu', 'in_pruefung', ''].includes(lookupKey(r.fields.bearbeitungsstatus) ?? ''))
      .sort((x, y) => (x.fields.wunsch_anreise ?? '').localeCompare(y.fields.wunsch_anreise ?? '')),
    [reservierungsanfragen],
  );
  const offenePortraets = useMemo(
    () => enrichedPortraets.filter(p => p.fields.an_besitzer_gesendet !== true),
    [enrichedPortraets],
  );

  const sendPortraet = (id: string, name: string) => {
    setAufenthaltsportraets(prev => prev.map(p => p.record_id === id
      ? { ...p, fields: { ...p.fields, an_besitzer_gesendet: true } } : p));
    LivingAppsService.updateAufenthaltsportraet(id, { an_besitzer_gesendet: true }).catch(() => fetchAll());
    undoToast(tx`${name} — als gesendet markiert`, () => {
      setAufenthaltsportraets(prev => prev.map(p => p.record_id === id
        ? { ...p, fields: { ...p.fields, an_besitzer_gesendet: false } } : p));
      LivingAppsService.updateAufenthaltsportraet(id, { an_besitzer_gesendet: false }).catch(() => fetchAll());
    });
  };

  const columns: KanbanColumn[] = (LOOKUP_OPTIONS['aufenthalte']?.['status'] ?? [])
    .map(o => ({ key: o.key, label: o.label }));

  const focusIds = focus === 'anreise' ? new Set(anreisen.map(a => a.record_id))
    : focus === 'abreise' ? new Set(abreisen.map(a => a.record_id)) : null;

  const cards: KanbanCard[] = enrichedAufenthalte
    .filter(a => !focusIds || focusIds.has(a.record_id))
    .sort((x, y) => (x.fields.anreise ?? '').localeCompare(y.fields.anreise ?? ''))
    .map(a => {
      const s = statusOf(a) || (columns[0]?.key ?? '');
      return {
        id: `aufenthalt:${a.record_id}`,
        column: s,
        title: a.hundName || tx('Ohne Hund'),
        subtitle: `${formatDate(a.fields.anreise)} – ${formatDate(a.fields.abreise)}`,
        tone: toneFor(s),
      };
    });

  const moveCard = (cardId: string, col: string) => {
    const id = cardId.split(':')[1];
    const a = enrichedAufenthalte.find(r => r.record_id === id);
    if (!a || statusOf(a) === col) return;
    if (FLOW_OWNED.includes(col)) {
      const go = flowActionFor('aufenthalte', 'status', id, col);
      go?.();
      return tx('Im Ablauf bestätigen');
    }
    const rec = aufenthalte.find(r => r.record_id === id);
    if (rec) crud.aufenthalte.openEdit(rec);
    return tx('Status im Formular ändern');
  };

  const openAufenthalt = (id: string) => {
    const rec = aufenthalte.find(r => r.record_id === id);
    if (rec) crud.aufenthalte.openDetail(rec);
  };

  const rangeLine = (a: EnrichedAufenthalte) => `${formatDate(a.fields.anreise)} – ${formatDate(a.fields.abreise)}`;

  const hundeNamen = (xs: EnrichedAufenthalte[]) => namen(xs.map(a => a.hundName));
  let context: string;
  if (aufenthalte.length === 0) {
    context = tx('Richte deine Pension ein — lege den ersten Aufenthalt an.');
  } else if (eingecheckt.length > 0 && anreisen.length > 0) {
    context = tx`Gerade zu Gast: ${hundeNamen(eingecheckt)} — als Nächstes reist ${hundeNamen(anreisen)} an.`;
  } else if (eingecheckt.length > 0) {
    context = abreisen.length > 0
      ? tx`Gerade zu Gast: ${hundeNamen(eingecheckt)} — bald reist ${hundeNamen(abreisen)} ab.`
      : tx`Gerade zu Gast: ${hundeNamen(eingecheckt)}.`;
  } else if (anreisen.length > 0) {
    context = tx`Aktuell kein Hund da — bald kommt ${hundeNamen(anreisen)}.`;
  } else if (offeneAnfragen.length > 0) {
    context = tx`Ruhige Tage — ${namen(offeneAnfragen.map(r => r.fields.anfrage_hundename ?? ''))} wartet auf eine Antwort.`;
  } else {
    context = tx('Ruhige Tage — alle Gäste sind versorgt.');
  }

  const hero = ohneImpfung.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: tx('Hund prüfen'),
        onClick: () => {
          const h = hunde.find(x => x.record_id === ohneImpfung[0].id);
          if (h) crud.hunde.openDetail(h);
        },
      }}
    >
      <b>{namen(ohneImpfung.map(o => o.name))}</b> {tx('ohne aktuellen Impfschutz bei geplantem oder laufendem Aufenthalt.')}
    </HeroBanner>
  ) : undefined;

  const toggle = (f: Focus) => setFocus(cur => (cur === f ? 'all' : f));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.aufenthalte.canWrite && (
          <Button onClick={() => crud.aufenthalte.openCreate({ status: 'angefragt' })}>
            <IconPlus size={16} className="shrink-0" />
            <span>{tx('Neuer Aufenthalt')}</span>
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Anreisen (7 Tage)')}
              value={anreisen.length}
              onClick={() => toggle('anreise')}
              active={focus === 'anreise'}
            />
            <StatStripItem
              title={tx('Abreisen (7 Tage)')}
              value={abreisen.length}
              onClick={() => toggle('abreise')}
              active={focus === 'abreise'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            defaultCollapsed={['abgeschlossen', 'storniert']}
            onCardClick={card => openAufenthalt(card.id.split(':')[1] ?? '')}
            onCardMove={moveCard}
            onAddCard={crud.aufenthalte.canWrite ? (col => crud.aufenthalte.openCreate({ status: col })) : undefined}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Neue Anfragen')}
              items={offeneAnfragen.map(r => {
                const go = flowActionFor('reservierungsanfragen', 'bearbeitungsstatus', r.record_id, 'angenommen');
                return {
                  id: r.record_id,
                  title: `${r.fields.anfrage_hundename ?? ''} · ${r.fields.anfrage_firstname ?? ''} ${r.fields.anfrage_lastname ?? ''}`.trim(),
                  secondLine: (
                    <>
                      <span className="font-medium text-amber-600">{lookupLabelOf(r.fields.bearbeitungsstatus?.label) ?? tx('Neu')}</span>
                      <span className="text-muted-foreground"> · {formatDate(r.fields.wunsch_anreise)} – {formatDate(r.fields.wunsch_abreise)}</span>
                    </>
                  ),
                  action: go ? { label: tx('Prüfen'), onClick: go } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = reservierungsanfragen.find(r => r.record_id === id);
                if (rec) crud.reservierungsanfragen.openDetail(rec);
              }}
              empty={{ text: tx('Keine offenen Anfragen — alles beantwortet.') }}
            />
            <WorkList
              title={tx('Anreisen & Abreisen')}
              items={[...anreisen, ...abreisen].map(a => {
                const arriving = statusOf(a) !== 'eingecheckt';
                return {
                  id: a.record_id,
                  title: a.hundName,
                  secondLine: (
                    <>
                      <span className={arriving ? 'font-medium text-primary' : 'font-medium text-emerald-600'}>
                        {arriving ? tx('Anreise') : tx('Abreise')}
                      </span>
                      <span className="text-muted-foreground"> · {rangeLine(a)}</span>
                    </>
                  ),
                  action: advanceAction(a),
                };
              })}
              onItemClick={openAufenthalt}
              empty={{ text: tx('In den nächsten 7 Tagen steht nichts an.') }}
            />
            <WorkList
              title={tx('Porträts noch nicht gesendet')}
              items={offenePortraets.map(p => ({
                id: p.record_id,
                title: p.fields.titel ?? p.aufenthaltName,
                secondLine: <span className="text-muted-foreground">{p.aufenthaltName}</span>,
                action: crud.aufenthaltsportraets.canWrite
                  ? { label: tx('Gesendet'), onClick: () => sendPortraet(p.record_id, p.fields.titel ?? p.aufenthaltName) }
                  : undefined,
              }))}
              onItemClick={id => {
                const rec = aufenthaltsportraets.find(p => p.record_id === id);
                if (rec) crud.aufenthaltsportraets.openDetail(rec);
              }}
              empty={{
                text: tx('Alle Porträts sind bei den Besitzern.'),
                action: crud.aufenthaltsportraets.canWrite
                  ? { label: tx('Porträt anlegen'), onClick: () => crud.aufenthaltsportraets.openCreate({}) }
                  : undefined,
              }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}

function lookupLabelOf(label: string | undefined): string | undefined {
  return label;
}
