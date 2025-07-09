'use client';

import React, { useState, useEffect } from 'react';
import { FloatingIssueButton } from './floating-button';
import { IssueReporterModal } from './issue-reporter-modal';
import { consoleCapture } from '@/lib/issue-reporter/console-capture';
import { captureScreenshot } from '@/lib/issue-reporter/screenshot-capture';
import { toast } from 'sonner';

export function IssueReporter() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

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
      />
    </>
  );
}