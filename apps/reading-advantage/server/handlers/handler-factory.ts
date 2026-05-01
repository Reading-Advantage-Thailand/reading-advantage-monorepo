// handlers/genericHandler.ts
import { NextRequest, NextResponse } from "next/server";
import catchAsync from "../utils/catch-async";
import { ExtendedNextRequest } from "../controllers/auth-controller";
import { DBCollection } from "../models/enum";
import { DocumentData } from "firebase/firestore";
import createFirestoreService from "../services/create-firestore-service";

export const getOne = <T extends DocumentData>(collection: DBCollection) =>
  catchAsync(
    async (
      req: ExtendedNextRequest,
      { params: { id } }: { params: { id: string } }
    ) => {
      const service = createFirestoreService<T>(collection);
      const doc = await service.getDoc(id);

      if (!doc) {
        return NextResponse.json(
          {
            message: "Document not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: doc,
      });
    }
  );

export const updateOne = <T extends DocumentData>(collection: DBCollection) =>
  catchAsync(
    async (
      req: ExtendedNextRequest,
      { params: { id } }: { params: { id: string } }
    ) => {
      const body = await req.json();
      if (!body) {
        return NextResponse.json(
          {
            message: "No data to update",
          },
          { status: 400 }
        );
      }
      const service = createFirestoreService<T>(collection);
      await service.updateDoc(id, body);

      return NextResponse.json(
        {
          message: "Document updated",
          data: body,
        },
        { status: 200 }
      );
    }
  );

export const deleteOne = <T extends DocumentData>(collection: DBCollection) =>
  catchAsync(
    async (
      req: ExtendedNextRequest,
      { params: { id } }: { params: { id: string } }
    ) => {
      const service = createFirestoreService<T>(collection);
      await service.deleteDoc(id);

      return NextResponse.json({
        message: "Document deleted",
      });
    }
  );

export const getAlls = <T extends DocumentData>(collection: DBCollection) =>
  catchAsync(async (req: ExtendedNextRequest) => {
    const filter = Object.fromEntries(req.nextUrl.searchParams.entries());
    const service = createFirestoreService<T>(collection);
    const docs = await service.getAllDocs({
      select: filter.select
        ? JSON.parse(decodeURIComponent(filter.select))
        : undefined,
    });

    return NextResponse.json({
      length: docs.length,
      data: docs,
    });
  });

// export const filtered = <T extends DocumentData>(collection: DBCollection) =>
//     catchAsync(async (req: ExtendedNextRequest) => {
//         const filter = Object.fromEntries(req.nextUrl.searchParams.entries());

//         if (!filter.orderBy || !filter.startAt || !filter.limit || !filter.select) {
//             return NextResponse.json({
//                 message: "Invalid filter, must include orderBy, startAt, limit, and select",
//             }, { status: 400 });
//         }
//         const service = createFirestoreService<T>(collection);
//         const docs = await service.getFilteredDocs({
//             orderBy: filter.orderBy,
//             startAt: Number(filter.startAt),
//             limit: Number(filter.limit),
//             select: JSON.parse(decodeURIComponent(filter.select)),
//         });

//         return NextResponse.json({
//             length: docs.length,
//             data: docs,
//         });
//     });
