import { normalizeFirestoreDate } from './b2b-dashboard';

describe('normalizeFirestoreDate', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should handle a valid Firestore timestamp object (toDate returns valid Date)', () => {
    const firestoreDate = {
      toDate: () => new Date('2023-12-01T08:00:00.000Z'),
    };
    expect(normalizeFirestoreDate(firestoreDate)).toBe('2023-12-01T08:00:00.000Z');
  });

  it('should handle a valid ISO date string', () => {
    expect(normalizeFirestoreDate('2024-05-15T14:30:00.000Z')).toBe('2024-05-15T14:30:00.000Z');
  });

  it('should handle a valid epoch timestamp number', () => {
    const timestamp = new Date('2024-05-15T14:30:00.000Z').getTime();
    expect(normalizeFirestoreDate(timestamp)).toBe('2024-05-15T14:30:00.000Z');
  });

  it('should fallback when toDate throws an error', () => {
    const mockObject = {
      toDate: () => {
        throw new Error('Invalid format');
      },
    };
    expect(normalizeFirestoreDate(mockObject)).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should fallback when toDate returns an invalid Date', () => {
    const mockObject = {
      toDate: () => new Date('invalid-date'),
    };
    expect(normalizeFirestoreDate(mockObject)).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should fallback when toDate is not a function', () => {
    const mockObject = {
      toDate: 'not-a-function',
    };
    expect(normalizeFirestoreDate(mockObject)).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should fallback for null, undefined, and empty objects', () => {
    expect(normalizeFirestoreDate(null)).toBe('2024-01-01T12:00:00.000Z');
    expect(normalizeFirestoreDate(undefined)).toBe('2024-01-01T12:00:00.000Z');
    expect(normalizeFirestoreDate({})).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should fallback for invalid date strings and numbers', () => {
    expect(normalizeFirestoreDate('invalid-date')).toBe('2024-01-01T12:00:00.000Z');
    expect(normalizeFirestoreDate(NaN)).toBe('2024-01-01T12:00:00.000Z');
  });
});
