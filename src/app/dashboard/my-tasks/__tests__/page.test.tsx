import { mapContentStatusToDueDateStatus } from '../utils';

describe('mapContentStatusToDueDateStatus', () => {
  it('maps known statuses to DueDateIndicator statuses', () => {
    expect(mapContentStatusToDueDateStatus('draft')).toBe('draft');
    expect(mapContentStatusToDueDateStatus('pending_review')).toBe('in_review');
    expect(mapContentStatusToDueDateStatus('under_review')).toBe('in_review');
    expect(mapContentStatusToDueDateStatus('approved')).toBe('approved');
    expect(mapContentStatusToDueDateStatus('published')).toBe('published');
    expect(mapContentStatusToDueDateStatus('completed')).toBe('completed');
    expect(mapContentStatusToDueDateStatus('cancelled')).toBe('completed');
    expect(mapContentStatusToDueDateStatus('rejected')).toBe('rejected');
  });

  it('returns undefined for unknown or missing statuses', () => {
    expect(mapContentStatusToDueDateStatus('unknown')).toBeUndefined();
    expect(mapContentStatusToDueDateStatus(null)).toBeUndefined();
    expect(mapContentStatusToDueDateStatus(undefined)).toBeUndefined();
  });
});
