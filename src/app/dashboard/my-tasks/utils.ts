export type DueDateStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'completed'
  | 'rejected'
  | undefined;

export const mapContentStatusToDueDateStatus = (
  status: string | null | undefined,
): DueDateStatus => {
  if (!status) return undefined;
  switch (status) {
    case 'draft':
      return 'draft';
    case 'pending_review':
    case 'under_review':
      return 'in_review';
    case 'approved':
      return 'approved';
    case 'published':
      return 'published';
    case 'completed':
    case 'cancelled':
      return 'completed';
    case 'rejected':
      return 'rejected';
    default:
      return undefined;
  }
};
