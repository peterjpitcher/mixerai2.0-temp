'use client';

import React, { useState, useEffect } from 'react';
import { FloatingIssueButton } from './floating-button';
import { IssueReporterModal } from './issue-reporter-modal';
import { consoleCapture } from '@/lib/issue-reporter/console-capture';

export function IssueReporter() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Initialize console capture when component mounts
    consoleCapture.initialize();

    return () => {
      // Cleanup on unmount (optional - you might want to keep it running)
      // consoleCapture.destroy();
    };
  }, []);

  return (
    <>
      <FloatingIssueButton
        position="bottom-right"
        onOpen={() => setIsModalOpen(true)}
      />
      <IssueReporterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}