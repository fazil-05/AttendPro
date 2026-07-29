// src/hooks/useCamera.ts
// Live camera capture hook — only webcam/front camera, no gallery upload

import { useState, useRef, useCallback } from 'react';

interface CameraState {
  isActive: boolean;
  capturedImage: string | null;
  error: string | null;
  isLoading: boolean;
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({
    isActive: false,
    capturedImage: null,
    error: null,
    isLoading: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Start the camera stream.
   * On mobile: uses front camera (facingMode: user).
   * On desktop: uses default webcam.
   */
  const startCamera = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, capturedImage: null }));

    try {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      const constraints: MediaStreamConstraints = {
        video: isMobile
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({ ...prev, isActive: true, isLoading: false }));
    } catch (error: unknown) {
      let message = 'Camera access failed.';
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          message = 'Camera permission denied. Please allow camera access.';
        } else if (error.name === 'NotFoundError') {
          message = 'No camera found on this device.';
        }
      }
      setState(prev => ({ ...prev, error: message, isLoading: false }));
    }
  }, []);

  /**
   * Capture a frame from the video stream as a base64 JPEG.
   */
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror the image for selfie (front camera feel)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setState(prev => ({ ...prev, capturedImage: dataUrl, isActive: false }));
    stopCamera();
    return dataUrl;
  }, []);

  /**
   * Stop the camera stream.
   */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  /**
   * Reset state and retake photo.
   */
  const resetCamera = useCallback(() => {
    stopCamera();
    setState({ isActive: false, capturedImage: null, error: null, isLoading: false });
  }, [stopCamera]);

  return {
    ...state,
    videoRef,
    startCamera,
    capturePhoto,
    stopCamera,
    resetCamera,
  };
}
