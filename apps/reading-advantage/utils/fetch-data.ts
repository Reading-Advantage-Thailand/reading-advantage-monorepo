import { headers } from "next/headers";

// server-side
export async function fetchData(
  url: string,
  { log = false, method = "GET" } = {},
  payLoad?: Record<string, any>
) {
  const headersList = await headers();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${url}`, {
    method: method,
    headers: headersList,
    body: payLoad ? JSON.stringify(payLoad) : undefined,
  });
  const data = await response.json();
  if (log) console.log(data);
  return data;
}
