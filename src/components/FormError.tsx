export function FormFieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1.5 text-xs text-red-400">{message}</p>;
  }