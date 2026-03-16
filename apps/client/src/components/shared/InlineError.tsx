interface InlineErrorProps {
  message: string | undefined;
}

export default function InlineError({ message }: InlineErrorProps) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}
