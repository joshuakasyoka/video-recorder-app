interface TagsDisplayProps {
    tags: string[];
  }
  
  export default function TagsDisplay({ tags }: TagsDisplayProps) {
    return (
      <div className="space-y-2">
        <h2 className="font-sm mb-4 text-white">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="px-4 py-2 border border-white text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }