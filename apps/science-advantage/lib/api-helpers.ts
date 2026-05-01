import { NextResponse } from 'next/server';

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(error: string, status: number = 400, details?: unknown) {
  const payload: { success: false; error: string; details?: unknown } = {
    success: false,
    error,
  };
  
  if (details !== undefined) {
    payload.details = details;
  }
  
  return NextResponse.json(payload, { status });
}
