import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { QuoteDocumentView } from '../document/documentView';
import { STATUS_LABELS } from '../domain/format';
import { pdfText } from './pdfFormat';

const BLUE = '#1D4ED8';
const TEXT = '#0F172A';
const MUTED = '#475569';
const BORDER = '#E2E8F0';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: TEXT, lineHeight: 1.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  company: { flexDirection: 'row', gap: 12, maxWidth: '60%' },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: MUTED },
  docBox: { alignItems: 'flex-end' },
  docTitle: {
    fontSize: 20,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    marginBottom: 4,
  },
  status: { marginTop: 4, fontSize: 9, color: MUTED, textTransform: 'uppercase' },
  parties: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  party: { flex: 1, padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 6 },
  label: { fontSize: 8, color: MUTED, textTransform: 'uppercase', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  object: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: TEXT,
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: BORDER },
  colDesignation: { flex: 1, paddingRight: 8 },
  colVat: { width: 60, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: TEXT,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  acceptance: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
  },
  signature: {
    marginTop: 20,
    padding: 10,
    height: 70,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
  },
  mentions: { marginTop: 20, fontSize: 8, color: MUTED, gap: 2 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
  },
});

interface QuotePdfProps {
  view: QuoteDocumentView;
  /** Logo déjà téléchargé (PNG ou JPEG), ou null. */
  logo: { data: Buffer; format: 'png' | 'jpg' } | null;
}

export function QuotePdf({ view, logo }: QuotePdfProps) {
  const t = pdfText;
  return (
    <Document title={t(`Devis ${view.number}`)} author={t(view.company.name)} language="fr">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.company}>
            {/* Image de react-pdf (PDF, pas du HTML) : pas d'attribut alt possible. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo ? <Image style={styles.logo} src={logo} /> : null}
            <View>
              <Text style={styles.companyName}>{t(view.company.name)}</Text>
              {view.company.details.map((detail) => (
                <Text key={detail} style={styles.muted}>
                  {t(detail)}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docTitle}>DEVIS</Text>
            <Text style={styles.bold}>{t(view.number)}</Text>
            <Text>{t(`Date : ${view.issueDateLabel}`)}</Text>
            <Text>{t(`Valable jusqu’au : ${view.validUntilLabel}`)}</Text>
            <Text style={styles.status}>{t(STATUS_LABELS[view.status])}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>Client</Text>
            <Text style={styles.bold}>{t(view.client.name)}</Text>
            {view.client.address ? <Text>{t(view.client.address)}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Adresse du chantier</Text>
            <Text>{t(view.siteAddress)}</Text>
          </View>
        </View>

        <Text style={styles.object}>{t(`Objet : ${view.title}`)}</Text>

        <View style={styles.tableHead}>
          <Text style={styles.colDesignation}>Désignation</Text>
          {view.isFranchise ? null : <Text style={styles.colVat}>TVA</Text>}
          <Text style={styles.colTotal}>Total HT</Text>
        </View>
        {view.lines.map((line, index) => (
          <View key={`${index}-${line.designation}`} style={styles.row} wrap={false}>
            <View style={styles.colDesignation}>
              <Text>{t(line.designation)}</Text>
              <Text style={styles.muted}>{t(line.detail)}</Text>
            </View>
            {line.vatLabel ? (
              <Text style={styles.colVat}>{t(line.vatLabel.replace('TVA ', ''))}</Text>
            ) : null}
            <Text style={styles.colTotal}>{t(line.total)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          {view.totals.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={styles.muted}>{t(row.label)}</Text>
              <Text>{t(row.value)}</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text>{t(view.totalLabel)}</Text>
            <Text>{t(view.totalValue)}</Text>
          </View>
          {view.deposit ? (
            <View style={styles.totalRow}>
              <Text>{t(view.deposit.label)}</Text>
              <Text>{t(view.deposit.amount)}</Text>
            </View>
          ) : null}
          {view.deposit?.paid ? (
            <View style={styles.totalRow}>
              <Text>{t(`Acompte reçu le ${view.deposit.paid.atLabel}`)}</Text>
              <Text>{t(view.deposit.paid.amount)}</Text>
            </View>
          ) : null}
        </View>

        {view.acceptance ? (
          <View style={styles.acceptance} wrap={false}>
            <Text style={styles.bold}>Bon pour accord, signé en ligne</Text>
            <Text>{t(`Accepté par ${view.acceptance.byName} le ${view.acceptance.atLabel}.`)}</Text>
          </View>
        ) : (
          <View style={styles.signature} wrap={false}>
            <Text style={styles.label}>Bon pour accord : date et signature du client</Text>
          </View>
        )}

        <View style={styles.mentions}>
          {view.mentions.map((mention) => (
            <Text key={mention}>{t(mention)}</Text>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            t(`Devis ${view.number} · page ${pageNumber}/${totalPages}`)
          }
          fixed
        />
      </Page>
    </Document>
  );
}
