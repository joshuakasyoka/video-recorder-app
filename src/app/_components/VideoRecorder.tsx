'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, StopCircle } from 'lucide-react';

interface VideoRecorderProps {
  onVideoReady: (file: File) => void;
}

export default function VideoRecorder({ onVideoReady }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request high-quality video stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 }, // Full HD width
          height: { ideal: 1080 }, // Full HD height
          frameRate: { ideal: 30 }, // 30 FPS
          facingMode: 'user', // Use front camera
        },
        audio: true
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Configure MediaRecorder with high-quality settings
      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9,opus', // Use VP9 codec for better quality
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], 'recorded-video.webm', { type: 'video/webm' });
        onVideoReady(file);
        chunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Failed to access camera. Please ensure you have granted camera permissions.');
    }
  }, [onVideoReady]);

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
    </div>
  );
}