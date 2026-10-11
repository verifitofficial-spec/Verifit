export function FormFieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-red-400" role="alert">
      {message}
    </p>
  );
}
