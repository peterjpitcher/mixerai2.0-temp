export const SYSTEM_TEMPLATE_IDS = ['article-template', 'product-template'] as const;

const systemTemplateIdSet = new Set<string>(SYSTEM_TEMPLATE_IDS);

export function isSystemTemplateId(templateId?: string | null): boolean {
  if (!templateId) {
    return false;
  }
  return systemTemplateIdSet.has(templateId);
}
