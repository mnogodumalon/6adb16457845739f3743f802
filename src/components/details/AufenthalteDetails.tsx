import type { Aufenthalte, Hunde, Aufenthaltsportraets } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface AufenthalteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Aufenthalte;
  /** N:1-Ziel „Hunde": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  hundeList: Hunde[];
  /** Klick auf die Hunde-Relation → overlay.push auf dessen Detail. */
  onOpenHunde?: (record: Hunde) => void;
  /** 1:N „Aufenthaltsporträts" (aufenthalt): VOLLE Liste — der Block filtert auf diesen Record. */
  aufenthaltsportraetsList: Aufenthaltsportraets[];
  /** Zeilen-Klick → overlay.push auf das Aufenthaltsportraets-Detail (nie der Edit-Dialog). */
  onOpenAufenthaltsportraets: (record: Aufenthaltsportraets) => void;
  /** Kontextuelles „+": öffnet den Aufenthaltsportraets-Dialog mit diesem Record vorgesetzt. */
  onAddAufenthaltsportraets?: () => void;
}

export function AufenthalteDetails({
  record,
  hundeList,
  onOpenHunde,
  aufenthaltsportraetsList,
  onOpenAufenthaltsportraets,
  onAddAufenthaltsportraets,
}: AufenthalteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const hundTarget = hundeList.find(r => r.record_id === extractRecordId(record.fields.hund));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('aufenthalte', 'anreise')} value={record.fields.anreise} format="date" />
        <RecordField label={fieldLabel('aufenthalte', 'abreise')} value={record.fields.abreise} format="date" />
        <RecordField label={fieldLabel('aufenthalte', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('aufenthalte', 'unterkunft')} value={record.fields.unterkunft} format="text" />
        <RecordField label={fieldLabel('aufenthalte', 'preis_pro_tag')} value={record.fields.preis_pro_tag} format="text" />
        <RecordField label={fieldLabel('aufenthalte', 'besonderheiten')} value={record.fields.besonderheiten} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufenthalte', 'interne_notizen')} value={record.fields.interne_notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('aufenthalte', 'hund')}
          name={hundTarget?.fields.hundename ?? '—'}
          meta={[hundTarget?.fields.rasse, hundTarget?.fields.tierarzt].filter(Boolean).join(' · ') || undefined}
          onClick={hundTarget && onOpenHunde ? () => onOpenHunde!(hundTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('aufenthaltsportraets')}
        items={aufenthaltsportraetsList.filter(r => extractRecordId(r.fields.aufenthalt) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('aufenthaltsportraets'), meta: r.fields.portraet_datum })}
        onOpen={onOpenAufenthaltsportraets}
        onAdd={onAddAufenthaltsportraets}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.AUFENTHALTE} recordId={record.record_id} readOnly={!perms.canWrite('aufenthalte')} />
    </>
  );
}
