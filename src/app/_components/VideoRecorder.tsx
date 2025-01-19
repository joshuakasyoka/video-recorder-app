'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, StopCircle } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (file: File) => void;
}

export default function VideoRecorder({ onVideoReady }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check if device is iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Function to get supported mime type
  const getSupportedMimeType = () => {
    if (isIOS) {
      // For iOS, prioritize MP4
      const iosTypes = [
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ];
      return iosTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/mp4';
    }

    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
  };

  // Function to check and request permissions
  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (result.state === 'denied') {
        setPermissionDenied(true);
        throw new Error('Camera permission denied');
      }
    } catch {
      // Some browsers (like Safari) don't support permission query
      console.log('Permission query not supported, will try direct access');
    }
  };

  // Initialize camera with proper constraints
  const initializeCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: isIOS ? 1280 : 1920 },
          height: { ideal: isIOS ? 720 : 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
      }

      return mediaStream;
    } catch (err) {
      console.error('Camera access error:', err);
      if ((err as Error).name === 'NotAllowedError') {
        setPermissionDenied(true);
      }
      throw err;
    }
  }, [isIOS]);

  const startRecording = useCallback(async () => {
    try {
      await checkPermissions();
      const mediaStream = await initializeCamera();
      setStream(mediaStream);

      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType); // Debug log

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: isIOS ? 1500000 : 2500000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = getSupportedMimeType();
        const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `recorded-video.${fileExtension}`, { type: mimeType });
        onVideoReady(file);
        chunksRef.current = [];
      };

      // For iOS, we want more frequent data chunks
      const timeSlice = isIOS ? 1000 : undefined; // 1 second chunks for iOS

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(timeSlice);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording setup error:', err);
      if (permissionDenied) {
        alert('Camera access was denied. Please enable camera access in your device settings and refresh the page.');
      } else {
        alert('Failed to access camera. Please ensure you have granted camera permissions and are using a supported browser.');
      }
    }
  }, [onVideoReady, permissionDenied, isIOS, initializeCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [isRecording, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-video bg-gray-900 rounded-lg"
      />
      
      <div className="flex justify-center">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
          >
            <Camera className="w-5 h-5" />
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
          >
            <StopCircle className="w-5 h-5" />
            <span>Stop Recording</span>
          </button>
        )}
      </div>

      {permissionDenied && (
        <p className="text-red-500 text-sm text-center mt-2">
          Camera access was denied. Please enable camera access in your device settings and refresh the page.
        </p>
      )}
    </div>
  );
}