import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className }: Props) {
  return (
    <div
      className={`prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-16 prose-pre:bg-muted prose-code:before:content-none prose-code:after:content-none ${
        className ?? ''
      }`}
    >
      {content.trim() === '' ? (
        <p className="text-sm text-muted-foreground">미리보기가 여기에 표시됩니다.</p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      )}
    </div>
  );
}
