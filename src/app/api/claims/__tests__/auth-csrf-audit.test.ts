import { describe, it, expect } from '@jest/globals';

describe('claims auth + CSRF + audit', () => {
  it.skip('rejects POST without CSRF (integration)', async () => {
    // Placeholder: exercise POST /api/claims without x-csrf-token header, expect 403
    expect(true).toBe(true);
  });

  it.skip('enforces brand permission (integration)', async () => {
    // Placeholder: attempt to create brand-level claim without brand admin role, expect 403
    expect(true).toBe(true);
  });

  it.skip('writes claim audit log on POST (integration)', async () => {
    // Placeholder: after successful creation, verify row in claim_audit_logs
    expect(true).toBe(true);
  });
});

