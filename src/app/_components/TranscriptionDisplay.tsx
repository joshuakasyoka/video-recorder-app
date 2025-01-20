interface TranscriptionDisplayProps {
    transcription: string;
  }
  
  export default function TranscriptionDisplay({ transcription }: TranscriptionDisplayProps) {
    return (
      <div className="px-4 py-2 border border-white text-sm">
        <h2 className="mb-4 text-white">TRANSCRIPTIONS</h2>
        <div>
          <p className="text-white whitespace-pre-wrap">{transcription}</p>
        </div>
      </div>
    );
  }