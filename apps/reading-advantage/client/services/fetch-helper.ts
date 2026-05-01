import { toast } from "@/components/ui/use-toast";

export const fetchData = async <T>(
  url: string,
  options: RequestInit,
  toastOptions?: { title: string; description?: string }
): Promise<T> => {
  const response = await fetch(url, options);
  // console.log(response);

  if (!response.ok) {
    const error = await response.json();
    console.error(error);
    if (toastOptions) {
      toast({
        title: toastOptions.title,
        variant: "destructive",
        description:
          toastOptions.description || error.message || "Failed to fetch data",
      });
    }
    throw new Error(error.message || "Failed to fetch data");
  }

  const data: T = await response.json();
  return data;
};
