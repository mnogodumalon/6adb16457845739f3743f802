import type { Besitzer, Hunde } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface BesitzerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Besitzer;
  /** 1:N „Hunde" (besitzer): VOLLE Liste — der Block filtert auf diesen Record. */
  hundeList: Hunde[];
  /** Zeilen-Klick → overlay.push auf das Hunde-Detail (nie der Edit-Dialog). */
  onOpenHunde: (record: Hunde) => void;
  /** Kontextuelles „+": öffnet den Hunde-Dialog mit diesem Record vorgesetzt. */
  onAddHunde?: () => void;
}

export function BesitzerDetails({
  record,
  hundeList,
  onOpenHunde,
  onAddHunde,
}: BesitzerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('besitzer', 'besitzer_firstname')} value={record.fields.besitzer_firstname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'besitzer_lastname')} value={record.fields.besitzer_lastname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('besitzer', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('besitzer', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('besitzer', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('besitzer', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('besitzer', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('besitzer', 'notfallkontakt_firstname')} value={record.fields.notfallkontakt_firstname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'notfallkontakt_lastname')} value={record.fields.notfallkontakt_lastname} format="text" />
        <RecordField label={fieldLabel('besitzer', 'notfallkontakt_telefon')} value={record.fields.notfallkontakt_telefon} format="text" />
        <RecordField label={fieldLabel('besitzer', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('hunde')}
        items={hundeList.filter(r => extractRecordId(r.fields.besitzer) === record.record_id)}
        map={r => ({ name: r.fields.hundename ?? appLabel('hunde'), meta: r.fields.geburtsdatum })}
        onOpen={onOpenHunde}
        onAdd={onAddHunde}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.BESITZER} recordId={record.record_id} readOnly={!perms.canWrite('besitzer')} />
    </>
  );
}
