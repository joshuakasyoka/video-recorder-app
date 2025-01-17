interface TagsDisplayProps {
    tags: string[];
  }
  
  export default function TagsDisplay({ tags }: TagsDisplayProps) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }