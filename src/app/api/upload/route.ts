import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import clientPromise from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { VideoDocument, CloudinaryUploadResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extend the timeout and body size limits
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    maxDuration: 60, // Extend to 60 seconds
  },
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    
    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Add status updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Convert video to buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    // Upload to Cloudinary first
    try {
      const cloudinaryResult = await uploadToCloudinary({ buffer }) as CloudinaryUploadResult;
      
      // Download the video from Cloudinary and convert to audio for OpenAI
      const response = await fetch(cloudinaryResult.secure_url);
      const videoBlob = await response.blob();
      const audioFile = new File([videoBlob], 'audio.webm', { type: 'video/webm' });

      // Get video transcription from OpenAI
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "text"
      });

      if (!transcription) {
        throw new Error('Failed to generate transcription');
      }

      // Generate tags using OpenAI
      const tagsResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate 3-5 relevant tags based on this transcription. Return only the tags separated by commas."
          },
          {
            role: "user",
            content: transcription
          }
        ]
      });

      const tagContent = tagsResponse?.choices?.[0]?.message?.content;
      if (!tagContent) {
        throw new Error('Failed to generate tags');
      }

      const tags = tagContent.split(',').map(tag => tag.trim());

      // Save to MongoDB
      const mongoClient = await clientPromise;
      const db = mongoClient.db('video-transcriptions');
      
      const videoDoc: Omit<VideoDocument, '_id'> = {
        videoUrl: cloudinaryResult.secure_url,
        transcription: transcription,
        tags,
        createdAt: new Date(),
      };

      const result = await db.collection('videos').insertOne(videoDoc);

      return NextResponse.json({
        message: 'Upload successful',
        transcription: transcription,
        tags,
        videoUrl: cloudinaryResult.secure_url,
        _id: result.insertedId
      });
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}