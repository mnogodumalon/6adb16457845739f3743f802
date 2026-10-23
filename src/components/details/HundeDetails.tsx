import type { Hunde, Besitzer, Aufenthalte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface HundeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Hunde;
  /** N:1-Ziel „Besitzer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  besitzerList: Besitzer[];
  /** Klick auf die Besitzer-Relation → overlay.push auf dessen Detail. */
  onOpenBesitzer?: (record: Besitzer) => void;
  /** 1:N „Aufenthalte" (hund): VOLLE Liste — der Block filtert auf diesen Record. */
  aufenthalteList: Aufenthalte[];
  /** Zeilen-Klick → overlay.push auf das Aufenthalte-Detail (nie der Edit-Dialog). */
  onOpenAufenthalte: (record: Aufenthalte) => void;
  /** Kontextuelles „+": öffnet den Aufenthalte-Dialog mit diesem Record vorgesetzt. */
  onAddAufenthalte?: () => void;
}

export function HundeDetails({
  record,
  besitzerList,
  onOpenBesitzer,
  aufenthalteList,
  onOpenAufenthalte,
  onAddAufenthalte,
}: HundeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const besitzerTarget = besitzerList.find(r => r.record_id === extractRecordId(record.fields.besitzer));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('hunde', 'hundename')} value={record.fields.hundename} format="text" />
        <RecordField label={fieldLabel('hunde', 'rasse')} value={record.fields.rasse} format="text" />
        <RecordField label={fieldLabel('hunde', 'geschlecht')} value={record.fields.geschlecht} format="pill" />
        <RecordField label={fieldLabel('hunde', 'geburtsdatum')} value={record.fields.geburtsdatum} format="date" />
        <RecordField label={fieldLabel('hunde', 'gewicht')} value={record.fields.gewicht} format="text" />
        <RecordField label={fieldLabel('hunde', 'kastriert')} value={record.fields.kastriert} format="bool" />
        <RecordField label={fieldLabel('hunde', 'impfung_aktuell')} value={record.fields.impfung_aktuell} format="bool" />
        <RecordField label={fieldLabel('hunde', 'tierarzt')} value={record.fields.tierarzt} format="text" />
        <RecordField label={fieldLabel('hunde', 'futterhinweise')} value={record.fields.futterhinweise} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('hunde', 'medikamente')} value={record.fields.medikamente} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('hunde', 'vertraeglichkeit')} value={record.fields.vertraeglichkeit} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('hunde', 'besitzer')}
          name={besitzerTarget?.fields.besitzer_firstname ?? '—'}
          meta={[besitzerTarget?.fields.email, besitzerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={besitzerTarget && onOpenBesitzer ? () => onOpenBesitzer!(besitzerTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('aufenthalte')}
        items={aufenthalteList.filter(r => extractRecordId(r.fields.hund) === record.record_id)}
        map={r => ({ name: r.fields.unterkunft ?? appLabel('aufenthalte'), meta: r.fields.anreise })}
        onOpen={onOpenAufenthalte}
        onAdd={onAddAufenthalte}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.HUNDE} recordId={record.record_id} readOnly={!perms.canWrite('hunde')} />
    </>
  );
}
