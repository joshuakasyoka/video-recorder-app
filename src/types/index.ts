// src/types/index.ts
import { ObjectId } from 'mongodb';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration: number;
}

export interface VideoDocument {
  _id?: ObjectId;
  videoUrl: string;
  transcription: string;
  tags: string[];
  createdAt: Date;
}

export interface UploadResponse {
  message: string;
  transcription?: string;
  tags?: string[];
  videoUrl?: string;
  _id?: string;
}