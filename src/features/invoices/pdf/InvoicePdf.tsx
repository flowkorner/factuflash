import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { pdfText } from '@/features/quotes/pdf/pdfFormat';
import type { InvoiceDocumentView } from '../document/invoiceView';

const BLUE = '#1D4ED8';
const TEXT = '#0F172A';
const MUTED = '#475569';
const BORDER = '#E2E8F0';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: TEXT, lineHeight: 1.4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  company: { flexDirection: 'row', gap: 12, maxWidth: '58%' },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  muted: { color: MUTED },
  docBox: { alignItems: 'flex-end' },
  docTitle: {
    fontSize: 18,
    lineHeight: 1.2,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    marginBottom: 4,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  infos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 8,
  },
  info: { width: '50%', paddingVertical: 3 },
  label: { fontSize: 8, color: MUTED, textTransform: 'uppercase' },
  parties: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  party: { flex: 1, padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 6 },
  object: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: TEXT,
    paddingBottom: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: BORDER },
  colDesignation: { flex: 1, paddingRight: 8 },
  colVat: { width: 60, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  deductionLabel: { flex: 1, paddingRight: 8, color: MUTED },
  deductionValue: { width: 80, textAlign: 'right' },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: TEXT,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  due: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    padding: 8,
    backgroundColor: '#EFF6FF',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  paid: { marginTop: 6, textAlign: 'right', color: '#166534', fontFamily: 'Helvetica-Bold' },
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

interface InvoicePdfProps {
  view: InvoiceDocumentView;
  logo: { data: Buffer; format: 'png' | 'jpg' } | null;
}

export function InvoicePdf({ view, logo }: InvoicePdfProps) {
  const t = pdfText;
  return (
    <Document title={t(`${view.title} ${view.number}`)} author={t(view.company.name)} language="fr">
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
            <Text style={styles.docTitle}>{t(view.title.toUpperCase())}</Text>
            <Text style={styles.bold}>{t(`N° ${view.number}`)}</Text>
          </View>
        </View>

        <View style={styles.infos}>
          {view.infos.map((info) => (
            <View key={info.label} style={styles.info}>
              <Text style={styles.label}>{t(info.label)}</Text>
              <Text>{t(info.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>Facturé à</Text>
            <Text style={styles.bold}>{t(view.client.name)}</Text>
            {view.client.address ? <Text>{t(view.client.address)}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Adresse du chantier</Text>
            <Text>{t(view.siteAddress)}</Text>
          </View>
        </View>

        <Text style={styles.object}>{t(`Objet : ${view.object}`)}</Text>

        <View style={styles.tableHead}>
          <Text style={styles.colDesignation}>Désignation</Text>
          {view.lines.some((line) => line.vatLabel) ? <Text style={styles.colVat}>TVA</Text> : null}
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
          {view.deductions.map((row) => (
            <View key={row.label} style={styles.totalRow}>
              <Text style={styles.deductionLabel}>{t(row.label)}</Text>
              <Text style={styles.deductionValue}>{t(row.value)}</Text>
            </View>
          ))}
          <View style={styles.due}>
            <Text>{t(view.amountDue.label)}</Text>
            <Text>{t(view.amountDue.value)}</Text>
          </View>
          {view.paidLabel ? (
            <Text style={styles.paid}>{t(`ACQUITTÉE · ${view.paidLabel}`)}</Text>
          ) : null}
        </View>

        <View style={styles.mentions}>
          {view.mentions.map((mention) => (
            <Text key={mention}>{t(mention)}</Text>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            t(`${view.title} ${view.number} · page ${pageNumber}/${totalPages}`)
          }
          fixed
        />
      </Page>
    </Document>
  );
}
