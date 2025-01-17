interface TranscriptionDisplayProps {
    transcription: string;
  }
  
  export default function TranscriptionDisplay({ transcription }: TranscriptionDisplayProps) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Transcription</h2>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
        </div>
      </div>
    );
  }