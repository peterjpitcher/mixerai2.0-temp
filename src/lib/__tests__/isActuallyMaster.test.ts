import { isGlobalCountryCode } from '../claims-utils';
import { GLOBAL_CLAIM_COUNTRY_CODE } from '../constants/claims';

describe('isActuallyMaster semantics', () => {
  test('global claim flagged as master by helper', () => {
    expect(isGlobalCountryCode(GLOBAL_CLAIM_COUNTRY_CODE)).toBe(true);
  });

  test('market claim not flagged as master by helper', () => {
    expect(isGlobalCountryCode('GB')).toBe(false);
  });

  test('helper tolerates casing and surrounding whitespace', () => {
    expect(isGlobalCountryCode('  __global__ ')).toBe(true);
  });
});
