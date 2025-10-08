import { interpolatePrompt } from '../generate-field/route';
import { createLocaleDirectives, describeLanguage } from '@/lib/utils/locale';

describe('locale helpers', () => {
  it('maps language codes (including region variants) to readable names', () => {
    expect(describeLanguage('fr')).toBe('French');
    expect(describeLanguage('fr-FR')).toBe('French');
    expect(describeLanguage('es_mx')).toBe('Spanish');
  });

  it('builds locale directives for non-English brands', () => {
    const directives = createLocaleDirectives('fr', 'FR');

    expect(directives.languageName).toBe('French');
    expect(directives.countryName).toBe('France');
    expect(directives.userInstructions.join(' ')).toContain('French');
    expect(directives.systemDirectives.join(' ')).toContain('France');
  });

  it('interpolates brand language placeholders when provided', () => {
    const prompt = 'Write in {{brand.language}} for shoppers in {{Brand Country}}.';
    const result = interpolatePrompt(
      prompt,
      {},
      {},
      {
        name: 'Old El Paso FR',
        brand_identity: 'Joyful Mexican cuisine',
        tone_of_voice: 'Warm and inviting',
        guardrails: 'Respect nutritional claims',
        language: 'fr',
        country: 'FR',
      }
    );

    expect(result).toContain('fr');
    expect(result).toContain('FR');
  });
});
