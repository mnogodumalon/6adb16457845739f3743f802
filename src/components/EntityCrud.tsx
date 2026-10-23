/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'besitzer'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.besitzer.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.besitzer.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.besitzer.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.besitzer              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   besitzer: besitzer_firstname, besitzer_lastname, email, telefon, strasse, hausnummer, plz, ort, …  ·  ← hunde (list + contextual +)
 *   hunde: hundename, besitzer, rasse, geschlecht, geburtsdatum, gewicht, kastriert, impfung_aktuell, …  ·  → besitzer · ← aufenthalte (list + contextual +)
 *   aufenthalte: hund, anreise, abreise, status, unterkunft, preis_pro_tag, besonderheiten, interne_notizen  ·  → hunde · ← aufenthaltsportraets (list + contextual +)
 *   aufenthaltsportraets: aufenthalt, titel, foto, geschichte, highlights, stimmung, portraet_datum, an_besitzer_gesendet  ·  → aufenthalte
 *   reservierungsanfragen: anfrage_firstname, anfrage_lastname, anfrage_email, anfrage_telefon, anfrage_hundename, anfrage_rasse, wunsch_anreise, wunsch_abreise, …
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Besitzer, Hunde, Aufenthalte, Aufenthaltsportraets, Reservierungsanfragen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichHunde, enrichAufenthalte, enrichAufenthaltsportraets } from '@/lib/enrich';
import type { EnrichedHunde, EnrichedAufenthalte, EnrichedAufenthaltsportraets } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BesitzerDialog, type BesitzerDialogDefaults } from '@/components/dialogs/BesitzerDialog';
import { BesitzerDetails } from '@/components/details/BesitzerDetails';
import { HundeDialog, type HundeDialogDefaults } from '@/components/dialogs/HundeDialog';
import { HundeDetails } from '@/components/details/HundeDetails';
import { AufenthalteDialog, type AufenthalteDialogDefaults } from '@/components/dialogs/AufenthalteDialog';
import { AufenthalteDetails } from '@/components/details/AufenthalteDetails';
import { AufenthaltsportraetsDialog, type AufenthaltsportraetsDialogDefaults } from '@/components/dialogs/AufenthaltsportraetsDialog';
import { AufenthaltsportraetsDetails } from '@/components/details/AufenthaltsportraetsDetails';
import { ReservierungsanfragenDialog, type ReservierungsanfragenDialogDefaults } from '@/components/dialogs/ReservierungsanfragenDialog';
import { ReservierungsanfragenDetails } from '@/components/details/ReservierungsanfragenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'besitzer'; record: Besitzer }
  | { type: 'hunde'; record: EnrichedHunde }
  | { type: 'aufenthalte'; record: EnrichedAufenthalte }
  | { type: 'aufenthaltsportraets'; record: EnrichedAufenthaltsportraets }
  | { type: 'reservierungsanfragen'; record: Reservierungsanfragen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  besitzer: EntityCrudApi<Besitzer, BesitzerDialogDefaults>;
  hunde: EntityCrudApi<Hunde, HundeDialogDefaults>;
  aufenthalte: EntityCrudApi<Aufenthalte, AufenthalteDialogDefaults>;
  aufenthaltsportraets: EntityCrudApi<Aufenthaltsportraets, AufenthaltsportraetsDialogDefaults>;
  reservierungsanfragen: EntityCrudApi<Reservierungsanfragen, ReservierungsanfragenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { besitzer: Besitzer[]; hunde: EnrichedHunde[]; aufenthalte: EnrichedAufenthalte[]; aufenthaltsportraets: EnrichedAufenthaltsportraets[]; reservierungsanfragen: Reservierungsanfragen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [besitzerDialog, setBesitzerDialog] = useState<{ defaults?: BesitzerDialogDefaults; editing?: Besitzer } | null>(null);
  const [hundeDialog, setHundeDialog] = useState<{ defaults?: HundeDialogDefaults; editing?: Hunde } | null>(null);
  const [aufenthalteDialog, setAufenthalteDialog] = useState<{ defaults?: AufenthalteDialogDefaults; editing?: Aufenthalte } | null>(null);
  const [aufenthaltsportraetsDialog, setAufenthaltsportraetsDialog] = useState<{ defaults?: AufenthaltsportraetsDialogDefaults; editing?: Aufenthaltsportraets } | null>(null);
  const [reservierungsanfragenDialog, setReservierungsanfragenDialog] = useState<{ defaults?: ReservierungsanfragenDialogDefaults; editing?: Reservierungsanfragen } | null>(null);
  const enrichedHunde = useMemo(() => enrichHunde(data.hunde, { besitzerMap: data.besitzerMap }), [data.hunde, data.besitzerMap]);
  const enrichedAufenthalte = useMemo(() => enrichAufenthalte(data.aufenthalte, { hundeMap: data.hundeMap }), [data.aufenthalte, data.hundeMap]);
  const enrichedAufenthaltsportraets = useMemo(() => enrichAufenthaltsportraets(data.aufenthaltsportraets, { aufenthalteMap: data.aufenthalteMap }), [data.aufenthaltsportraets, data.aufenthalteMap]);

  function detailBesitzer(record: Besitzer, push = false) {
    const item: OverlayItem = { type: 'besitzer', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBesitzer(fields: Besitzer['fields']) {
    const editing = besitzerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBesitzer(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBesitzerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('besitzer')} — ${t('crud_updated')}`, async () => {
        data.setBesitzer(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBesitzerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBesitzerEntry(fields);
      undoToast(`${appLabel('besitzer')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailHunde(record: Hunde, push = false) {
    const rec = enrichedHunde.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'hunde', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitHunde(fields: Hunde['fields']) {
    const editing = hundeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setHunde(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateHundeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('hunde')} — ${t('crud_updated')}`, async () => {
        data.setHunde(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateHundeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createHundeEntry(fields);
      undoToast(`${appLabel('hunde')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAufenthalte(record: Aufenthalte, push = false) {
    const rec = enrichedAufenthalte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aufenthalte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAufenthalte(fields: Aufenthalte['fields']) {
    const editing = aufenthalteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAufenthalte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAufenthalteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aufenthalte')} — ${t('crud_updated')}`, async () => {
        data.setAufenthalte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAufenthalteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAufenthalteEntry(fields);
      undoToast(`${appLabel('aufenthalte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAufenthaltsportraets(record: Aufenthaltsportraets, push = false) {
    const rec = enrichedAufenthaltsportraets.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aufenthaltsportraets', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAufenthaltsportraets(fields: Aufenthaltsportraets['fields']) {
    const editing = aufenthaltsportraetsDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAufenthaltsportraets(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAufenthaltsportraet(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aufenthaltsportraets')} — ${t('crud_updated')}`, async () => {
        data.setAufenthaltsportraets(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAufenthaltsportraet(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAufenthaltsportraet(fields);
      undoToast(`${appLabel('aufenthaltsportraets')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailReservierungsanfragen(record: Reservierungsanfragen, push = false) {
    const item: OverlayItem = { type: 'reservierungsanfragen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitReservierungsanfragen(fields: Reservierungsanfragen['fields']) {
    const editing = reservierungsanfragenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setReservierungsanfragen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateReservierungsanfragenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('reservierungsanfragen')} — ${t('crud_updated')}`, async () => {
        data.setReservierungsanfragen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateReservierungsanfragenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createReservierungsanfragenEntry(fields);
      undoToast(`${appLabel('reservierungsanfragen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <BesitzerDialog
        open={besitzerDialog !== null}
        onClose={() => setBesitzerDialog(null)}
        onSubmit={submitBesitzer}
        defaultValues={besitzerDialog?.defaults}
        recordId={besitzerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Besitzer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Besitzer']}
      />
      <HundeDialog
        open={hundeDialog !== null}
        onClose={() => setHundeDialog(null)}
        onSubmit={submitHunde}
        defaultValues={hundeDialog?.defaults}
        recordId={hundeDialog?.editing?.record_id}
        besitzerList={data.besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Hunde']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Hunde']}
      />
      <AufenthalteDialog
        open={aufenthalteDialog !== null}
        onClose={() => setAufenthalteDialog(null)}
        onSubmit={submitAufenthalte}
        defaultValues={aufenthalteDialog?.defaults}
        recordId={aufenthalteDialog?.editing?.record_id}
        hundeList={data.hunde}
        enablePhotoScan={AI_PHOTO_SCAN['Aufenthalte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufenthalte']}
      />
      <AufenthaltsportraetsDialog
        open={aufenthaltsportraetsDialog !== null}
        onClose={() => setAufenthaltsportraetsDialog(null)}
        onSubmit={submitAufenthaltsportraets}
        defaultValues={aufenthaltsportraetsDialog?.defaults}
        recordId={aufenthaltsportraetsDialog?.editing?.record_id}
        aufenthalteList={data.aufenthalte}
        enablePhotoScan={AI_PHOTO_SCAN['Aufenthaltsportraets']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufenthaltsportraets']}
      />
      <ReservierungsanfragenDialog
        open={reservierungsanfragenDialog !== null}
        onClose={() => setReservierungsanfragenDialog(null)}
        onSubmit={submitReservierungsanfragen}
        defaultValues={reservierungsanfragenDialog?.defaults}
        recordId={reservierungsanfragenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Reservierungsanfragen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reservierungsanfragen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'besitzer') {
            return (
              <>
                <RecordHeader title={top.record.fields.besitzer_firstname ?? appLabel('besitzer')} subtitle={undefined} />
                <BesitzerDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  onAddHunde={perms.canWrite('hunde') ? () => setHundeDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'hunde') {
            return (
              <>
                <RecordHeader title={top.record.fields.hundename ?? appLabel('hunde')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <HundeDetails
                  record={top.record}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                  aufenthalteList={data.aufenthalte}
                  onOpenAufenthalte={(r) => detailAufenthalte(r, true)}
                  onAddAufenthalte={perms.canWrite('aufenthalte') ? () => setAufenthalteDialog({ defaults: { hund: createRecordUrl(APP_IDS.HUNDE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'aufenthalte') {
            return (
              <>
                <RecordHeader title={top.record.fields.unterkunft ?? appLabel('aufenthalte')} subtitle={top.record.fields.anreise ? formatDate(top.record.fields.anreise) : undefined} />
                <AufenthalteDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  aufenthaltsportraetsList={data.aufenthaltsportraets}
                  onOpenAufenthaltsportraets={(r) => detailAufenthaltsportraets(r, true)}
                  onAddAufenthaltsportraets={perms.canWrite('aufenthaltsportraets') ? () => setAufenthaltsportraetsDialog({ defaults: { aufenthalt: createRecordUrl(APP_IDS.AUFENTHALTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'aufenthaltsportraets') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('aufenthaltsportraets')} subtitle={top.record.fields.portraet_datum ? formatDate(top.record.fields.portraet_datum) : undefined} />
                <AufenthaltsportraetsDetails
                  record={top.record}
                  aufenthalteList={data.aufenthalte}
                  onOpenAufenthalte={(r) => detailAufenthalte(r, true)}
                />
              </>
            );
          }
          if (top.type === 'reservierungsanfragen') {
            return (
              <>
                <RecordHeader title={top.record.fields.anfrage_firstname ?? appLabel('reservierungsanfragen')} subtitle={top.record.fields.wunsch_anreise ? formatDate(top.record.fields.wunsch_anreise) : undefined} />
                <ReservierungsanfragenDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'besitzer') return perms.canWrite('besitzer');
          if (top.type === 'hunde') return perms.canWrite('hunde');
          if (top.type === 'aufenthalte') return perms.canWrite('aufenthalte');
          if (top.type === 'aufenthaltsportraets') return perms.canWrite('aufenthaltsportraets');
          if (top.type === 'reservierungsanfragen') return perms.canWrite('reservierungsanfragen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'besitzer') setBesitzerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'hunde') setHundeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufenthalte') setAufenthalteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufenthaltsportraets') setAufenthaltsportraetsDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'reservierungsanfragen') setReservierungsanfragenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    besitzer: {
      openCreate: (defaults?: BesitzerDialogDefaults) => (perms.canWrite('besitzer') ? setBesitzerDialog({ defaults }) : refuse()),
      openEdit: (record: Besitzer) => (perms.canWrite('besitzer') ? setBesitzerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Besitzer) => detailBesitzer(record, false),
      canWrite: perms.canWrite('besitzer'),
    },
    hunde: {
      openCreate: (defaults?: HundeDialogDefaults) => (perms.canWrite('hunde') ? setHundeDialog({ defaults }) : refuse()),
      openEdit: (record: Hunde) => (perms.canWrite('hunde') ? setHundeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Hunde) => detailHunde(record, false),
      canWrite: perms.canWrite('hunde'),
    },
    aufenthalte: {
      openCreate: (defaults?: AufenthalteDialogDefaults) => (perms.canWrite('aufenthalte') ? setAufenthalteDialog({ defaults }) : refuse()),
      openEdit: (record: Aufenthalte) => (perms.canWrite('aufenthalte') ? setAufenthalteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aufenthalte) => detailAufenthalte(record, false),
      canWrite: perms.canWrite('aufenthalte'),
    },
    aufenthaltsportraets: {
      openCreate: (defaults?: AufenthaltsportraetsDialogDefaults) => (perms.canWrite('aufenthaltsportraets') ? setAufenthaltsportraetsDialog({ defaults }) : refuse()),
      openEdit: (record: Aufenthaltsportraets) => (perms.canWrite('aufenthaltsportraets') ? setAufenthaltsportraetsDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aufenthaltsportraets) => detailAufenthaltsportraets(record, false),
      canWrite: perms.canWrite('aufenthaltsportraets'),
    },
    reservierungsanfragen: {
      openCreate: (defaults?: ReservierungsanfragenDialogDefaults) => (perms.canWrite('reservierungsanfragen') ? setReservierungsanfragenDialog({ defaults }) : refuse()),
      openEdit: (record: Reservierungsanfragen) => (perms.canWrite('reservierungsanfragen') ? setReservierungsanfragenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Reservierungsanfragen) => detailReservierungsanfragen(record, false),
      canWrite: perms.canWrite('reservierungsanfragen'),
    },
    enriched: { besitzer: data.besitzer, hunde: enrichedHunde, aufenthalte: enrichedAufenthalte, aufenthaltsportraets: enrichedAufenthaltsportraets, reservierungsanfragen: data.reservierungsanfragen },
  };
}
