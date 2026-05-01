import { TriangleAlertIcon } from "lucide-react";

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div className="bg-destructive/15 p-3 rounded-md flex gap-x-2 items-center text-sm text-destructive">
      <TriangleAlertIcon className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
