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
      const iosTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2', // Explicitly include audio codec
        'video/mp4',
        'video/quicktime',
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

  // Function to check both camera and microphone permissions
  const checkPermissions = async () => {
    try {
      // Check camera permission
      const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
      // Check microphone permission
      const microphoneResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (cameraResult.state === 'denied' || microphoneResult.state === 'denied') {
        setPermissionDenied(true);
        throw new Error('Camera or microphone permission denied');
      }
    } catch {
      // Some browsers (like Safari) don't support permission query
      console.log('Permission query not supported, will try direct access');
    }
  };

  // Initialize camera and microphone
  const initializeMedia = useCallback(async () => {
    try {
      // First request audio only to ensure microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Then request both video and audio with constraints
      const constraints = {
        video: {
          width: { ideal: isIOS ? 1280 : 1920 },
          height: { ideal: isIOS ? 720 : 1080 },
          frameRate: { ideal: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 2
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify that we have both audio and video tracks
      const hasAudio = mediaStream.getAudioTracks().length > 0;
      const hasVideo = mediaStream.getVideoTracks().length > 0;
      
      if (!hasAudio || !hasVideo) {
        throw new Error('Failed to get both audio and video streams');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
      }

      return mediaStream;
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
      await checkPermissions();
      const mediaStream = await initializeMedia();
      setStream(mediaStream);

      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType); // Debug log

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        videoBitsPerSecond: isIOS ? 1500000 : 2500000,
        audioBitsPerSecond: 128000 // Specify audio bitrate
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
  }, [onVideoReady, permissionDenied, isIOS, initializeMedia]);

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
          Camera or microphone access was denied. Please enable both camera and microphone access in your device settings and refresh the page.
        </p>
      )}
    </div>
  );
}