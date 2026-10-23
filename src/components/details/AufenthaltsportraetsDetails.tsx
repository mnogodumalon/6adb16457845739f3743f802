import type { Aufenthaltsportraets, Aufenthalte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { usePermissions } from '@/lib/permissions';

export interface AufenthaltsportraetsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Aufenthaltsportraets;
  /** N:1-Ziel „Aufenthalte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  aufenthalteList: Aufenthalte[];
  /** Klick auf die Aufenthalte-Relation → overlay.push auf dessen Detail. */
  onOpenAufenthalte?: (record: Aufenthalte) => void;
}

export function AufenthaltsportraetsDetails({
  record,
  aufenthalteList,
  onOpenAufenthalte,
}: AufenthaltsportraetsDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const aufenthaltTarget = aufenthalteList.find(r => r.record_id === extractRecordId(record.fields.aufenthalt));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('aufenthaltsportraets', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('aufenthaltsportraets', 'geschichte')} value={record.fields.geschichte} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'highlights')} value={record.fields.highlights} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'stimmung')} value={record.fields.stimmung} format="pill" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'portraet_datum')} value={record.fields.portraet_datum} format="date" />
        <RecordField label={fieldLabel('aufenthaltsportraets', 'an_besitzer_gesendet')} value={record.fields.an_besitzer_gesendet} format="bool" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('aufenthaltsportraets', 'aufenthalt')}
          name={aufenthaltTarget?.fields.unterkunft ?? '—'}
          meta={undefined}
          onClick={aufenthaltTarget && onOpenAufenthalte ? () => onOpenAufenthalte!(aufenthaltTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUFENTHALTSPORTRAETS} recordId={record.record_id} readOnly={!perms.canWrite('aufenthaltsportraets')} />
    </>
  );
}
