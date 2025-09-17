#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local', override: false });

const assertEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
};

const apiKey = assertEnv('AZURE_OPENAI_API_KEY');
const endpoint = assertEnv('AZURE_OPENAI_ENDPOINT');
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_OPENAI_DEPLOYMENT;
if (!deployment) {
  console.error('Missing AZURE_OPENAI_DEPLOYMENT_NAME or AZURE_OPENAI_DEPLOYMENT');
  process.exit(1);
}

const sections = [
  { heading: 'Introduction', min: 80, max: 100 },
  { heading: 'Key Facts', min: 50, max: 70 },
  { heading: 'History & Origins', min: 110, max: 140 },
  { heading: 'Appearance', min: 110, max: 140 },
  { heading: 'Temperament & Personality', min: 130, max: 160 },
  { heading: 'Exercise & Activity Needs', min: 90, max: 120 },
  { heading: 'Training & Intelligence', min: 90, max: 120 },
  { heading: 'Health & Lifespan', min: 110, max: 140 },
  { heading: 'Grooming & Care', min: 90, max: 120 },
  { heading: 'Diet & Nutrition', min: 90, max: 120 },
  { heading: 'Living With a Labrador', min: 110, max: 140 },
  { heading: 'Fun Facts', min: 50, max: 70 },
  { heading: 'Is the Labrador Right for You?', min: 110, max: 140 },
];

const banned = [/\bdoggie\b/i, /\bdoggies\b/i];

const stripTags = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = (text) => (text ? stripTags(text).split(/\s+/).filter(Boolean).length : 0);

const outputFieldId = 'breed_guide_body';

const escapeForRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPrompts = () => {
  const systemPrompt = `You are an expert content creator for the brand "TestBrand".\nReturn a single JSON object with no preface or trailing text. The ONLY key must be \"${outputFieldId}\" and the value must be a string containing the generated content. Do not include markdown code fences. Do not include commentary.\nContent Rules:\n- Generate concise, high-quality content without repetition or filler.\n- Avoid redundant phrases and synonym chains.\n- Use the exact heading order given in the field instructions.`;

  const headingList = sections
    .map((section) => `<h2>${section.heading} (${section.min}–${section.max} words)</h2>`)
    .join('\n');

  const wordTargets = sections
    .map((section) => `- ${section.heading}: aim for ~${Math.round((section.min + section.max) / 2)} words and ensure the count stays within ${section.min}-${section.max}.`)
    .join('\n');

  const userPrompt = `Create a Labrador breed guide with the following structure and requirements. Use the exact section order and headings below. Put the target word count in parentheses in each heading. Headings must be rendered exactly as shown, including the <h2> tags. Stay within each range (±5 words tolerance). Headings do not count towards the word totals. No overall word count at the end. Do not add extra sections.\n\nRequired heading sequence:\n${headingList}\n\nWord-count targeting guidance:\n${wordTargets}\n\nFor each section:\n- Write within the specified word count (±5 tolerance).\n- Provide clear, factual, grown-up language—no childish terms.\n- Use HTML headings (<h2>) and paragraphs (<p>) or bullet lists as appropriate.\n- Double-check word counts before responding; regenerate internally if any section is outside its range.\n- Do not omit the word count from the heading.\n- After writing, reread each section to ensure it satisfies the brief before finalising.\n\nSpecial formatting requirements:\n- In "Key Facts", provide 6 concise bullets; each bullet must be a full descriptive sentence of roughly 9-11 words so the section reaches 50-70 words overall.\n- Bullet sections must still render as <ul><li>...</li></ul> HTML.`;

  return { systemPrompt, userPrompt };
};

const MAX_ATTEMPTS = 3;

const generateContent = async (systemPrompt, userPrompt) => {
  const body = {
    model: deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2400,
    temperature: 0.2,
    top_p: 0.85,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-12-01-preview`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OpenAI request failed: ${response.status} ${errText}`);
  }

  const payload = await response.json();
  const message = payload.choices?.[0]?.message?.content || '';

  let parsed;
  try {
    parsed = JSON.parse(message);
  } catch (error) {
    throw new Error(`Failed to parse JSON content from Azure response. Raw: ${message}`);
  }

  const bodyContent = parsed?.[outputFieldId];
  if (!bodyContent || typeof bodyContent !== 'string') {
    throw new Error(`Could not locate the breed guide body using key ${outputFieldId}. Raw: ${JSON.stringify(parsed, null, 2)}`);
  }

  return bodyContent;
};

const validateContent = (bodyContent) => {
  const errors = [];

  sections.forEach(({ heading, min, max }) => {
    const headingPattern = escapeForRegex(heading).replace(/&/g, '(?:&|&amp;)');
    const headingRegex = new RegExp(`<h2>\\s*${headingPattern}\\s*\\(\\s*${min}(?:–|-)${max} words\\s*\\)\\s*<\\/h2>`, 'i');
    if (!headingRegex.test(bodyContent)) {
      errors.push(`Missing or malformed heading for "${heading} (${min}–${max} words)".`);
    }
  });

  const sectionMatches = [...bodyContent.matchAll(/<h2>([^<]+)<\/h2>/gi)];
  for (let i = 0; i < sectionMatches.length; i += 1) {
    const title = sectionMatches[i][1].trim();
    const startIndex = sectionMatches[i].index + sectionMatches[i][0].length;
    const endIndex = i + 1 < sectionMatches.length ? sectionMatches[i + 1].index : bodyContent.length;
    const chunk = bodyContent.slice(startIndex, endIndex);

    const normalizedTitle = title.replace(/&amp;/g, '&');
    const spec = sections.find((section) => normalizedTitle.startsWith(section.heading));
    if (!spec) {
      continue;
    }

    const words = wordCount(chunk);
    if (words < spec.min || words > spec.max) {
      errors.push(`${spec.heading} word count ${words} outside range ${spec.min}-${spec.max}`);
    }

    banned.forEach((pattern) => {
      if (pattern.test(chunk)) {
        errors.push(`${spec.heading} contains banned phrase matching ${pattern}`);
      }
    });
  }

  return errors;
};

async function run() {
  const { systemPrompt, userPrompt } = buildPrompts();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const bodyContent = await generateContent(systemPrompt, userPrompt);
      const errors = validateContent(bodyContent);
      if (errors.length === 0) {
        console.log('Breed guide generation succeeded with all quality checks passing.');
        return;
      }

      console.warn(`Attempt ${attempt} failed validation:`);
      errors.forEach((err) => console.warn(`  - ${err}`));
      console.warn('\n--- Raw Output ---');
      console.warn(bodyContent);
    } catch (error) {
      console.warn(`Attempt ${attempt} failed with error: ${error.message}`);
    }
    if (attempt < MAX_ATTEMPTS) {
      console.warn('Retrying...\n');
    }
  }

  console.error(`Failed after ${MAX_ATTEMPTS} attempts. Investigate the prompt or model configuration.`);
  process.exit(1);
}

run().catch((err) => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});
