'use client';

import { useState } from 'react';
import VideoUploader from './_components/VideoUploader';
import TranscriptionDisplay from './_components/TranscriptionDisplay';
import TagsDisplay from './_components/TagsDisplay';
import { UploadResponse } from '@/types';

export default function Home() {
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const handleUploadComplete = (data: UploadResponse) => {
    setUploadResult(data);
    if (data.videoUrl) {
      setVideoUrl(data.videoUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          IMAGINE ALGORITHMS
        </h1>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <VideoUploader onUploadComplete={handleUploadComplete} />
          </div>

          {videoUrl && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Uploadedd Video</h2>
              <video
                className="w-full rounded-lg"
                controls
                src={videoUrl}
              />
            </div>
          )}

          {uploadResult?.transcription && (
            <TranscriptionDisplay transcription={uploadResult.transcription} />
          )}

          {uploadResult?.tags && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <TagsDisplay tags={uploadResult.tags} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}