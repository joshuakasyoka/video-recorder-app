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
    <div className="min-h-screen bg-black">
      <main className="container mx-auto px-4 py-8">
      <h1 className="text-xl text-white mb-8 font-medium">
  LONDON AI <span style={{ color: '#BAFF39' }}>VOICES</span>
</h1>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="px-4 py-2 border border-white text-sm">
            <VideoUploader onUploadComplete={handleUploadComplete} />
          </div>

          {videoUrl && (
            <div className="px-4 py-2 border border-white text-sm">
              <h2 className="mb-4 text-white">UPLOADED VIDEOS</h2>
              <video
                className="w-full"
                controls
                src={videoUrl}
              />
            </div>
          )}

          {uploadResult?.transcription && (
            <TranscriptionDisplay transcription={uploadResult.transcription} />
          )}

          {uploadResult?.tags && (
            <div className="px-4 py-2 border border-white text-sm">
              <TagsDisplay tags={uploadResult.tags} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}