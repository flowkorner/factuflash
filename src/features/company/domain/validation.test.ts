import {
  COMPANY_ERRORS,
  formatPhone,
  formatSiret,
  isValidSiret,
  normalizePhone,
  validateCompany,
  validateLogo,
  vatNumberFromSiret,
} from './validation';

// SIRET fictifs qui passent le contrôle de Luhn (et l'exception La Poste).
const VALID_SIRET = '81234567800013';
const LA_POSTE_SIRET = '35600000000001';

describe('SIRET', () => {
  it('accepte un SIRET valide, y compris l’exception La Poste', () => {
    expect(isValidSiret(VALID_SIRET)).toBe(true);
    expect(isValidSiret(LA_POSTE_SIRET)).toBe(true);
  });

  it('refuse une faute de frappe', () => {
    expect(isValidSiret('81234567800014')).toBe(false);
  });

  it('se formate par blocs', () => {
    expect(formatSiret(VALID_SIRET)).toBe('812 345 678 00013');
  });

  it('donne le numéro de TVA intracommunautaire', () => {
    expect(vatNumberFromSiret(VALID_SIRET)).toBe('FR25812345678');
  });
});

describe('téléphone', () => {
  it.each([
    ['06 12 34 56 78', '0612345678'],
    ['06.12.34.56.78', '0612345678'],
    ['+33 (0)6 12 34 56 78', '+33612345678'],
    ['0033 6 12 34 56 78', '+33612345678'],
  ])('normalise %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('se formate pour l’affichage', () => {
    expect(formatPhone('0612345678')).toBe('06 12 34 56 78');
    expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78');
  });
});

describe('validateCompany', () => {
  const valid = {
    name: ' Plomberie Durand ',
    siret: '812 345 678 00013',
    address: '12 rue des Lilas, 69003 Lyon',
    phone: '06 12 34 56 78',
    vatMode: 'subject' as const,
  };

  it('normalise des données valides', () => {
    expect(validateCompany(valid)).toEqual({
      errors: {},
      data: {
        name: 'Plomberie Durand',
        siret: VALID_SIRET,
        address: '12 rue des Lilas, 69003 Lyon',
        phone: '0612345678',
        vatMode: 'subject',
      },
    });
  });

  it('signale chaque champ manquant', () => {
    const { errors, data } = validateCompany({
      name: '',
      siret: '123',
      address: '',
      phone: '12',
      vatMode: '',
    });
    expect(data).toBeNull();
    expect(errors).toEqual({
      name: COMPANY_ERRORS.nameRequired,
      siret: COMPANY_ERRORS.siretFormat,
      address: COMPANY_ERRORS.addressRequired,
      phone: COMPANY_ERRORS.phoneInvalid,
      vatMode: COMPANY_ERRORS.vatRequired,
    });
  });
});

describe('validateLogo', () => {
  it('refuse le SVG et les fichiers trop lourds', () => {
    expect(validateLogo({ type: 'image/svg+xml', size: 10 })).toBe(COMPANY_ERRORS.logoType);
    expect(validateLogo({ type: 'image/png', size: 3 * 1024 * 1024 })).toBe(
      COMPANY_ERRORS.logoSize,
    );
    expect(validateLogo({ type: 'image/webp', size: 1000 })).toBeNull();
  });
});
