import type { QuoteFormValues } from './types';
import { NEW_CLIENT } from './types';
import { QUOTE_ERRORS, validateQuote } from './validation';
import { buildLegalMentions } from './legalMentions';

function values(overrides: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    clientId: NEW_CLIENT,
    newClientName: ' M. Martin ',
    newClientEmail: 'Martin@Example.fr',
    title: 'Remplacement chauffe-eau',
    siteAddress: '3 rue des Lilas,  69003 Lyon',
    description: '',
    validityDays: 30,
    lines: [
      {
        key: 'l1',
        designation: 'Pose',
        quantity: '2,5',
        unit: 'h',
        unitPrice: '55,33',
        vatRateBp: 2000,
        source: 'manual',
        priceItemId: null,
      },
    ],
    ...overrides,
  };
}

describe('validateQuote', () => {
  it('normalise une saisie valide', () => {
    const { data, errors } = validateQuote(values(), 'subject');

    expect(errors).toEqual({});
    expect(data).toEqual({
      clientId: null,
      newClient: { name: 'M. Martin', email: 'martin@example.fr' },
      title: 'Remplacement chauffe-eau',
      siteAddress: '3 rue des Lilas, 69003 Lyon',
      description: '',
      validityDays: 30,
      lines: [
        {
          designation: 'Pose',
          quantityMilli: 2500,
          unit: 'h',
          unitPriceCents: 5533,
          vatRateBp: 2000,
          source: 'manual',
          priceItemId: null,
        },
      ],
    });
  });

  it('met la TVA à 0 en franchise', () => {
    expect(validateQuote(values(), 'franchise').data?.lines[0]?.vatRateBp).toBe(0);
  });

  it('signale chaque erreur, ligne par ligne', () => {
    const { data, errors } = validateQuote(
      values({
        clientId: '',
        title: ' ',
        siteAddress: '',
        lines: [
          {
            key: 'l1',
            designation: '',
            quantity: '0',
            unit: 'u',
            unitPrice: '12,345',
            vatRateBp: 2000,
            source: 'manual',
            priceItemId: null,
          },
        ],
      }),
      'subject',
    );

    expect(data).toBeNull();
    expect(errors).toEqual({
      clientId: QUOTE_ERRORS.clientRequired,
      title: QUOTE_ERRORS.titleRequired,
      siteAddress: QUOTE_ERRORS.siteAddressRequired,
      lineErrors: {
        l1: {
          designation: QUOTE_ERRORS.designationRequired,
          quantity: QUOTE_ERRORS.quantityInvalid,
          unitPrice: QUOTE_ERRORS.unitPriceInvalid,
        },
      },
    });
  });

  it('exige au moins une ligne', () => {
    expect(validateQuote(values({ lines: [] }), 'subject').errors.lines).toBe(
      QUOTE_ERRORS.linesRequired,
    );
  });
});

describe('buildLegalMentions', () => {
  it('indique la franchise de TVA', () => {
    expect(
      buildLegalMentions({
        companyName: 'Élec B',
        siret: '81234567800013',
        vatMode: 'franchise',
        validityDays: 30,
      }),
    ).toContain('TVA non applicable, art. 293 B du CGI.');
  });

  it('indique le n° de TVA et la validité', () => {
    const mentions = buildLegalMentions({
      companyName: 'Plomberie A',
      siret: '81234567800013',
      vatMode: 'subject',
      validityDays: 45,
    });
    expect(mentions[0]).toBe('Plomberie A · SIRET 81234567800013 · TVA FR25812345678');
    expect(mentions).toContain('Devis valable 45 jours à compter de sa date d’émission.');
  });
});
