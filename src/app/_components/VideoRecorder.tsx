// src/app/_components/VideoRecorder.tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, StopCircle, RefreshCcw } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (file: File) => void;
}

export default function VideoRecorder({ onVideoReady }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setError('Camera access is not available in your browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('Camera stream not available');
      return;
    }
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideo(url);
      
      // Create File object for upload
      const file = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
      onVideoReady(file);
    };

    // Start countdown
    let count = 3;
    setCountdown(count);
    const countdownInterval = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        mediaRecorder.start();
        setIsRecording(true);
        
        // Auto-stop after 60 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
          }
        }, 60000);
      }
    }, 1000);

    mediaRecorderRef.current = mediaRecorder;
  }, [onVideoReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedVideo(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    startCamera();
  }, [startCamera]);

  // Initialize camera on component mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!isRecording}
          className="w-full h-full object-cover"
          style={{ display: recordedVideo ? 'none' : 'block' }}
        />
        
        {recordedVideo && (
          <video
            src={recordedVideo}
            controls
            className="w-full h-full object-cover"
          />
        )}
        
        {countdown && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl text-white font-bold">{countdown}</span>
          </div>
        )}
        
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <div className="animate-pulse w-3 h-3 rounded-full bg-red-500" />
            <span className="text-white font-medium">Recording</span>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        {!recordedVideo ? (
          !isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              disabled={!!error}
            >
              <Camera className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              <StopCircle className="w-5 h-5" />
              <span>Stop Recording</span>
            </button>
          )
        ) : (
          <button
            onClick={resetRecording}
            className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Record Again</span>
          </button>
        )}
      </div>
    </div>
  );
}