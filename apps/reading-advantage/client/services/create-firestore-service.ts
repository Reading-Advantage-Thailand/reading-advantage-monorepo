import { DocumentData } from "firebase/firestore";
import { fetchData } from "./fetch-helper";
import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

const createFirestoreService = <T extends DocumentData>(
  collectionPath: string
) => {
  const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/${collectionPath}`;

  return {
    fetchDoc: async (docId: string, headers: ReadonlyHeaders) => {
      const url = `${apiUrl}/${docId}`;

      return fetchData<T>(
        url,
        { method: "GET", headers: headers, cache: "no-store" },
        {
          title: "Failed to fetch document",
        }
      );
    },
    createDoc: async (data: Partial<T>, headers?: ReadonlyHeaders) => {
      return fetchData<void>(
        apiUrl,
        {
          method: "POST",
          headers: headers || undefined,
          body: JSON.stringify(data),
          cache: "no-store",
        },
        {
          title: "Failed to create document",
        }
      );
    },
    updateDoc: async (
      docId: string,
      data: Partial<T>,
      headers?: ReadonlyHeaders
    ) => {
      const url = `${apiUrl}/${docId}`;
      return fetchData<void>(
        url,
        {
          method: "PATCH",
          headers: headers,
          body: JSON.stringify(data),
          cache: "no-store",
        },
        {
          title: "Failed to update document",
        }
      );
    },
    deleteDoc: async (docId: string, headers?: ReadonlyHeaders) => {
      const url = `${apiUrl}/${docId}`;
      return fetchData<void>(
        url,
        { method: "DELETE", headers: headers, cache: "no-store" },
        {
          title: "Failed to delete document",
        }
      );
    },
    fetchAllDocs: async (
      filter?: { select?: string[] },
      headers?: ReadonlyHeaders
    ) => {
      const selectParams = filter?.select
        ? encodeURIComponent(JSON.stringify(filter.select))
        : "";
      const url = selectParams ? `${apiUrl}?select=${selectParams}` : apiUrl;
      return fetchData<{ length: number; data: T[] }>(
        url,
        { method: "GET", headers: headers, cache: "no-store" },
        {
          title: "Failed to fetch documents",
        }
      );
    },

    fetchFilteredDocs: async (
      filter: {
        orderBy: string;
        startAt: number;
        limit: number;
        select: string[];
      },
      headers?: ReadonlyHeaders
    ) => {
      const selectParams = encodeURIComponent(JSON.stringify(filter.select));
      const url = `${apiUrl}?orderBy=${filter.orderBy}&startAt=${filter.startAt}&limit=${filter.limit}&select=${selectParams}`;
      return fetchData<{ length: number; data: T[] }>(
        url,
        { method: "GET", headers: headers, cache: "no-store" },
        {
          title: "Failed to fetch filtered documents",
        }
      );
    },
  };
};

export default createFirestoreService;
