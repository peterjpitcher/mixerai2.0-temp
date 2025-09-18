import { Suspense } from 'react';

import { ConfirmLogic } from './confirm-logic';

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmLogic />
    </Suspense>
  );
}
