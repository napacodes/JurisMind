export function PlainTextBody({ body, className = '' }: { body: string; className?: string }) {
  return <div className={`whitespace-pre-wrap ${className}`}>{body}</div>
}
