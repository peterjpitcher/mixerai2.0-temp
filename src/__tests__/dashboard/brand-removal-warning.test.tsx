import { render, screen } from '@testing-library/react';
import { BrandRemovalWarning } from '@/components/dashboard/users/brand-removal-warning';

describe('BrandRemovalWarning', () => {
  const baseProps = {
    open: true,
    onOpenChange: jest.fn(),
    userName: 'Jane Doe',
    brandName: 'Acme',
    isLoading: false,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('highlights active assignments when totals are non-zero', () => {
    render(
      <BrandRemovalWarning
        {...baseProps}
        impact={{
          workflow_count: 2,
          content_count: 1,
          total_assignments: 3,
          affected_workflows: [
            { id: 'wf-1', name: 'Launch Plan', status: 'active' },
            { id: 'wf-2', name: 'QA Review', status: 'pending' },
          ],
          affected_content: [{ id: 'content-1', title: 'Homepage Hero', status: 'in_progress' }],
        }}
      />
    );

    expect(screen.getByText(/This user has active assignments/i)).toBeInTheDocument();
    const assignmentsList = screen.getByRole('list');
    expect(assignmentsList).toHaveTextContent('2 workflows');
    expect(assignmentsList).toHaveTextContent('1 content item');
    expect(screen.getByText('Remove and Reassign')).toBeInTheDocument();
  });

  it('shows safe removal messaging when there are no assignments', () => {
    render(
      <BrandRemovalWarning
        {...baseProps}
        impact={{
          workflow_count: 0,
          content_count: 0,
          total_assignments: 0,
          affected_workflows: [],
          affected_content: [],
        }}
      />
    );

    expect(
      screen.getByText(/This user has no active assignments in this brand/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Remove from Brand')).toBeInTheDocument();
  });
});
