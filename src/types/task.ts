export interface Task {
  id: string;
  task_status: 'pending' | 'draft' | 'completed' | 'rejected';
  due_date: string | null;
  created_at: string;
  content_id: string;
  content_title: string;
  content_status: string;
  brand_id?: string;
  brand_name?: string;
  brand_color?: string;
  workflow_id?: string;
  workflow_name?: string;
  workflow_step_id?: string;
  workflow_step_name?: string;
  workflow_step_order?: number;
} 