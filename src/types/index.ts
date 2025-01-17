export interface VideoDocument {
    _id?: string;
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
  }