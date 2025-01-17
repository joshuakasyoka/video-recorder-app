import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import clientPromise from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { VideoDocument, CloudinaryUploadResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
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

    // Add size check
    if (videoFile.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Convert video to buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    try {
      // Step 1: Upload to Cloudinary
      console.log('Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary({ buffer }) as CloudinaryUploadResult;
      console.log('Cloudinary upload successful');

      // Step 2: Prepare audio file for OpenAI
      console.log('Preparing audio file...');
      const response = await fetch(cloudinaryResult.secure_url);
      if (!response.ok) {
        throw new Error('Failed to fetch video from Cloudinary');
      }
      const videoBlob = await response.blob();
      const audioFile = new File([videoBlob], 'audio.webm', { type: 'video/webm' });

      // Step 3: Get transcription
      console.log('Getting transcription...');
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "text"
      });

      if (!transcription) {
        throw new Error('Failed to generate transcription');
      }
      console.log('Transcription successful');

      // Step 4: Generate tags
      console.log('Generating tags...');
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
      console.log('Tags generated successfully');

      // Step 5: Save to MongoDB
      console.log('Saving to MongoDB...');
      const mongoClient = await clientPromise;
      const db = mongoClient.db('video-transcriptions');
      
      const videoDoc: Omit<VideoDocument, '_id'> = {
        videoUrl: cloudinaryResult.secure_url,
        transcription: transcription,
        tags,
        createdAt: new Date(),
      };

      const result = await db.collection('videos').insertOne(videoDoc);
      console.log('MongoDB save successful');

      // Return success response
      return new NextResponse(
        JSON.stringify({
          message: 'Upload successful',
          transcription: transcription,
          tags,
          videoUrl: cloudinaryResult.secure_url,
          _id: result.insertedId
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

    } catch (processingError) {
      console.error('Processing error:', processingError);
      return new NextResponse(
        JSON.stringify({ 
          error: processingError instanceof Error ? processingError.message : 'Processing failed' 
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}