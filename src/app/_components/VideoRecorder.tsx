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
  const getSupportedMimeType = useCallback(() => {
    if (isIOS) {
      return 'video/mp4';
    }
    return 'video/webm';
  }, [isIOS]);

  // Initialize media devices with separate audio setup for iOS
  const initializeMedia = useCallback(async () => {
    try {
      // First, explicitly request microphone access
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      
      // Then request video
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isIOS ? 1280 : 1920 },
          height: { ideal: isIOS ? 720 : 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: false
      });

      // Combine audio and video tracks
      const combinedTracks = [
        ...audioStream.getAudioTracks(),
        ...videoStream.getVideoTracks()
      ];
      
      const combinedStream = new MediaStream(combinedTracks);

      // Verify we have both audio and video tracks
      if (combinedStream.getAudioTracks().length === 0) {
        throw new Error('No audio track available');
      }

      if (combinedStream.getVideoTracks().length === 0) {
        throw new Error('No video track available');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
        videoRef.current.setAttribute('playsinline', 'true');
        // Unmute to test audio
        videoRef.current.muted = false;
      }

      return combinedStream;
    } catch (err) {
      console.error('Media access error:', err);
      if ((err as Error).name === 'NotAllowedError') {
        setPermissionDenied(true);
      }
      throw err;
    }
  }, [isIOS]);

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await initializeMedia();
      setStream(mediaStream);

      const options: MediaRecorderOptions = {
        mimeType: getSupportedMimeType(),
        audioBitsPerSecond: 128000
      };

      console.log('Using MIME type:', options.mimeType);

      const mediaRecorder = new MediaRecorder(mediaStream, options);

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

      // For iOS, use smaller chunks
      const timeSlice = isIOS ? 1000 : undefined;

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(timeSlice);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording setup error:', err);
      if (permissionDenied) {
        alert('Camera or microphone access was denied. Please enable both camera and microphone access in your device settings and refresh the page.');
      } else {
        alert('Failed to access camera or microphone. Please ensure you have granted both camera and microphone permissions and are using a supported browser.');
      }
    }
  }, [onVideoReady, permissionDenied, isIOS, initializeMedia, getSupportedMimeType]);

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
      videoRef.current.muted = true;
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
          Camera or microphone access was denied. Please enable both camera and microphone access in your device settings and refresh the page.
        </p>
      )}
    </div>
  );
}