// src/app/_components/VideoUploader.tsx
'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import VideoRecorder from './VideoRecorder';
import { UploadResponse } from '@/types';

interface VideoUploaderProps {
  onUploadComplete: (data: UploadResponse) => void;
}

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [recordedVideo, setRecordedVideo] = useState<File | null>(null);

  const handleVideoReady = (videoFile: File) => {
    setRecordedVideo(videoFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!recordedVideo) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', recordedVideo);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json() as UploadResponse;
      onUploadComplete(data);
    } catch (error) {
      setError('Failed to upload video. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <VideoRecorder onVideoReady={handleVideoReady} />

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {recordedVideo && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5" />
          <span>{uploading ? 'Processing...' : 'Upload & Transcribe'}</span>
        </button>
      )}
    </div>
  );
}