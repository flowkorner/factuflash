import {
  centsToInput,
  formatCents,
  formatQuantity,
  milliToDecimalString,
  parseEuroToCents,
  parseQuantityToMilli,
} from './money';

describe('montants', () => {
  it.each([
    ['55', 5500],
    ['55,33', 5533],
    ['55.5', 5550],
    ['1 200', 120000],
    ['0', 0],
    ['12,345', null],
    ['-3', null],
    ['abc', null],
    ['', null],
  ])('parseEuroToCents(%p) = %p', (input, expected) => {
    expect(parseEuroToCents(input)).toBe(expected);
  });

  it('se reformate pour la saisie et l’affichage', () => {
    expect(centsToInput(5533)).toBe('55,33');
    expect(centsToInput(5500)).toBe('55');
    expect(centsToInput(505)).toBe('5,05');
    expect(formatCents(62800).replace(/\s/g, ' ')).toBe('628,00 €');
  });
});

describe('quantités', () => {
  it.each([
    ['1', 1000],
    ['2,5', 2500],
    ['0,125', 125],
    ['0', null],
    ['1,2345', null],
  ])('parseQuantityToMilli(%p) = %p', (input, expected) => {
    expect(parseQuantityToMilli(input)).toBe(expected);
  });

  it('se convertit pour Postgres et l’affichage', () => {
    expect(milliToDecimalString(2500)).toBe('2.5');
    expect(milliToDecimalString(1000)).toBe('1');
    expect(milliToDecimalString(125)).toBe('0.125');
    expect(formatQuantity(2500)).toBe('2,5');
  });
});
