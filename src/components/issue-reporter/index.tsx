'use client';

import React, { useState, useEffect } from 'react';
import { FloatingIssueButton } from './floating-button';
import { IssueReporterModal } from './issue-reporter-modal';
import { consoleCapture } from '@/lib/issue-reporter/console-capture';
import { captureScreenshot } from '@/lib/issue-reporter/screenshot-capture';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/use-common-data';

const ISSUE_REPORTER_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ISSUE_REPORTER !== 'false';

export function IssueReporter() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const userRole = currentUser?.user_metadata?.role?.toString().toLowerCase();
  const canReportIssues = ISSUE_REPORTER_ENABLED && userRole === 'admin';

  useEffect(() => {
    // Initialize console capture when component mounts
    consoleCapture.initialize();

    return () => {
      // Cleanup on unmount (optional - you might want to keep it running)
      // consoleCapture.destroy();
    };
  }, []);

  const handleOpen = async () => {
    setIsCapturing(true);

    try {
      // Capture screenshot BEFORE opening modal
      const screenshot = await captureScreenshot();
      setCapturedScreenshot(screenshot);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast.error('Failed to capture screenshot, but you can still report the issue');
      setIsModalOpen(true);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!canReportIssues || isLoading) {
    return null;
  }

  return (
    <>
      <FloatingIssueButton
        position="bottom-right"
        onOpen={handleOpen}
        isLoading={isCapturing}
      />
      <IssueReporterModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCapturedScreenshot(null); // Clear screenshot after closing
        }}
        preloadedScreenshot={capturedScreenshot}
        currentUser={currentUser}
      />
    </>
  );
}
