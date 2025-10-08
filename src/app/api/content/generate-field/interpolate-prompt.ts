import type { Brand } from '@/types/models';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const interpolatePrompt = (
  promptText: string,
  templateFieldValues: Record<string, string>,
  existingOutputs: Record<string, string>,
  brandDetails: Pick<Brand, 'name' | 'brand_identity' | 'tone_of_voice' | 'guardrails' | 'language' | 'country'> | null
): string => {
  let interpolated = promptText;

  Object.entries(templateFieldValues).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${escapeRegex(key)}}}`, 'g');
    interpolated = interpolated.replace(placeholder, value);
  });

  Object.entries(existingOutputs).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${escapeRegex(key)}}}`, 'g');
    interpolated = interpolated.replace(placeholder, value);
  });

  if (brandDetails) {
    const brandName = brandDetails.name ?? '';
    const brandIdentity = brandDetails.brand_identity ?? '';
    const toneOfVoice = brandDetails.tone_of_voice ?? '';
    const guardrails = brandDetails.guardrails ?? '';
    const language = brandDetails.language ?? '';
    const country = brandDetails.country ?? '';

    interpolated = interpolated.replace(/{{brand\.name}}/g, brandName);
    interpolated = interpolated.replace(/{{brand\.identity}}/g, brandIdentity);
    interpolated = interpolated.replace(/{{brand\.tone_of_voice}}/g, toneOfVoice);
    interpolated = interpolated.replace(/{{brand\.guardrails}}/g, guardrails);
    interpolated = interpolated.replace(/{{brand\.summary}}/g, brandIdentity);
    interpolated = interpolated.replace(/{{brand\.language}}/g, language);
    interpolated = interpolated.replace(/{{brand\.country}}/g, country);
    interpolated = interpolated.replace(
      /{{brand}}/g,
      JSON.stringify({
        name: brandName,
        identity: brandIdentity,
        tone_of_voice: toneOfVoice,
        guardrails,
        language,
        country,
      })
    );

    interpolated = interpolated.replace(/{{Brand Name}}/g, brandName);
    interpolated = interpolated.replace(/{{Brand Identity}}/g, brandIdentity);
    interpolated = interpolated.replace(/{{Tone of Voice}}/g, toneOfVoice);
    interpolated = interpolated.replace(/{{Guardrails}}/g, guardrails);
    interpolated = interpolated.replace(/{{Brand Language}}/g, language);
    interpolated = interpolated.replace(/{{Brand Country}}/g, country);
  }

  return interpolated;
};
