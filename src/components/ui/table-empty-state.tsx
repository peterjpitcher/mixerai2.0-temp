import { LucideIcon } from "lucide-react";

interface TableEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function TableEmptyState({ icon: Icon, title, description }: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      )}
    </div>
  );
}