import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import clientPromise from '@/lib/mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { CloudinaryUploadResult } from '@/types';

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
      // Upload to Cloudinary
      console.log('Uploading to Cloudinary...');
      const cloudinaryResult = await uploadToCloudinary({ buffer }) as CloudinaryUploadResult;
      console.log('Cloudinary upload successful');

      // Get transcription
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

      // Generate tags
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

      // Save to MongoDB
      console.log('Saving to MongoDB...');
      try {
        const mongoClient = await clientPromise;
        const db = mongoClient.db('video-transcriptions');
        
        const videoDoc = {
          videoUrl: cloudinaryResult.secure_url,
          transcription: transcription,
          tags,
          createdAt: new Date(),
        };

        const result = await db.collection('videos').insertOne(videoDoc);
        console.log('MongoDB save successful');

        // Create response data
        const responseData = {
          success: true,
          message: 'Upload successful',
          data: {
            transcription,
            tags,
            videoUrl: cloudinaryResult.secure_url,
            _id: result.insertedId.toString()
          }
        };

        // Return the response
        return new NextResponse(JSON.stringify(responseData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });

      } catch (dbError) {
        console.error('MongoDB error:', dbError);
        return new NextResponse(JSON.stringify({
          success: false,
          error: 'Database operation failed'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

    } catch (processingError) {
      console.error('Processing error:', processingError);
      return new NextResponse(JSON.stringify({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'Processing failed'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (uploadError) {
    console.error('Upload error:', uploadError);
    return new NextResponse(JSON.stringify({
      success: false,
      error: uploadError instanceof Error ? uploadError.message : 'Upload failed'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};