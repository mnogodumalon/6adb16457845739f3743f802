import type { Reservierungsanfragen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface ReservierungsanfragenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Reservierungsanfragen;
}

export function ReservierungsanfragenDetails({
  record,
}: ReservierungsanfragenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_firstname')} value={record.fields.anfrage_firstname} format="text" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_lastname')} value={record.fields.anfrage_lastname} format="text" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_email')} value={record.fields.anfrage_email} format="email" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_telefon')} value={record.fields.anfrage_telefon} format="text" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_hundename')} value={record.fields.anfrage_hundename} format="text" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'anfrage_rasse')} value={record.fields.anfrage_rasse} format="text" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'wunsch_anreise')} value={record.fields.wunsch_anreise} format="date" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'wunsch_abreise')} value={record.fields.wunsch_abreise} format="date" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'nachricht')} value={record.fields.nachricht} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('reservierungsanfragen', 'bearbeitungsstatus')} value={record.fields.bearbeitungsstatus} format="pill" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.RESERVIERUNGSANFRAGEN} recordId={record.record_id} readOnly={!perms.canWrite('reservierungsanfragen')} />
    </>
  );
}
