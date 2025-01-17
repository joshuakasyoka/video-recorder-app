// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import clientPromise from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { VideoDocument, CloudinaryUploadResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Convert video to buffer
    const buffer = Buffer.from(await videoFile.arrayBuffer());

    try {
      console.log('Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary({ buffer }) as CloudinaryUploadResult;
      console.log('Cloudinary upload successful');

      console.log('Getting transcription...');
      const transcription = await openai.audio.transcriptions.create({
        file: videoFile,
        model: "whisper-1",
        language: "en",
        response_format: "text"
      });

      if (!transcription) {
        throw new Error('Failed to generate transcription');
      }
      console.log('Transcription successful');

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

      // Return success response with proper JSON structure
      return NextResponse.json({
        success: true,
        message: 'Upload successful',
        data: {
          transcription,
          tags,
          videoUrl: cloudinaryResult.secure_url,
          _id: result.insertedId
        }
      });

    } catch (error) {
      console.error('Processing error:', error);
      // Ensure error response is properly formatted
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }, { 
        status: 500 
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    // Ensure error response is properly formatted
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { 
      status: 500 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};