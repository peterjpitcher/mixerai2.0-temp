import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// A mapping from status to badge variant for colour-coding
const statusVariantMap: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  draft: 'secondary',
  pending_review: 'default',
  approved: 'default',
  published: 'default',
  rejected: 'destructive',
};

// Define the shape of the content data we expect
interface Content {
  id: string;
  title: string;
  status: string;
  current_step: number;
  brands: { name: string } | null;
  content_types: { name: string } | null;
  workflows: { name: string; steps: { name: string }[] } | null;
}

interface ContentWorkflowMatrixProps {
  content: Content[];
}

export function ContentWorkflowMatrix({ content }: ContentWorkflowMatrixProps) {
  if (!content || content.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-lg font-semibold">No Content Yet</h3>
        <p className="text-sm text-muted-foreground">
          There is no content to display. Get started by creating new content.
        </p>
      </div>
    );
  }

  // Group content by workflow step name
  const contentByStep = content.reduce((acc, item) => {
    let stepName: string;

    // Check if workflow and steps exist and the current step is a valid index
    if (item.workflows && Array.isArray(item.workflows.steps) && item.workflows.steps[item.current_step]) {
      stepName = item.workflows.steps[item.current_step].name;
    } else {
      // Fallback to grouping by status if a valid workflow step is not available.
      // This makes it clear why the content isn't in a workflow-specific group.
      stepName = `Status: ${item.status ? item.status.replace(/_/g, ' ') : 'Unknown'}`;
    }

    if (!acc[stepName]) {
      acc[stepName] = [];
    }
    acc[stepName].push(item);
    return acc;
  }, {} as { [key: string]: Content[] });

  return (
    <div className="space-y-6">
      {Object.entries(contentByStep).map(([stepName, items]) => {
        if (items.length === 0) return null;
        return (
          <div key={stepName}>
            <h3 className="text-xl font-semibold capitalize mb-2">{stepName} ({items.length})</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link href={`/content/${item.id}`} className="hover:underline">
                          {item.title}
                        </Link>
                      </TableCell>
                      <TableCell>{item.brands?.name ?? 'N/A'}</TableCell>
                      <TableCell>{item.content_types?.name ?? 'N/A'}</TableCell>
                      <TableCell>{item.workflows?.name ?? 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariantMap[item.status] || 'default'}>
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
} 