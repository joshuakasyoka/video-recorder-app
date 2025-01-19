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
  const [progress, setProgress] = useState<string>('');

  const handleVideoReady = (videoFile: File) => {
    setRecordedVideo(videoFile);
    setError('');
  };

  const handleUpload = async () => {
    if (!recordedVideo) return;

    setUploading(true);
    setError('');
    setProgress('Uploading video...');

    try {
      const formData = new FormData();
      formData.append('video', recordedVideo);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Upload failed');
      }

      if (!responseData.data?.transcription) {
        throw new Error('No transcription received in the response');
      }
      
      onUploadComplete(responseData.data);
      setProgress('');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload video. Please try again.');
      setProgress('');
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

      {progress && (
        <p className="text-blue-500 text-sm">{progress}</p>
      )}

      {recordedVideo && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Upload className="w-5 h-5" />
          <span>{uploading ? 'Processing (this may take a minute)...' : 'Upload & Transcribe'}</span>
        </button>
      )}
    </div>
  );
}