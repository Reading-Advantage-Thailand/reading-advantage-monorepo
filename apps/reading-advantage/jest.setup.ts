import "@testing-library/jest-dom";

// Polyfill for Next.js server components in Node test environment
import { TextEncoder, TextDecoder } from "util";

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Mock Request and Response for Next.js server tests
if (typeof Request === "undefined") {
  (global as any).Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    
    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === "string" ? input : input.url;
      this.method = init?.method || "GET";
      this.headers = new Map();
    }
  };
}

if (typeof Response === "undefined") {
  (global as any).Response = class Response {
    status: number;
    
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.status = init?.status || 200;
    }
  };
}
