export class NextResponse {
  private _body: unknown
  private _status: number

  constructor(body: unknown, init?: { status?: number }) {
    this._body = body
    this._status = init?.status ?? 200
  }

  static json(body: unknown, init?: { status?: number }) {
    return new NextResponse(body, init)
  }

  async json() {
    return this._body
  }

  get status() {
    return this._status
  }
}

export class NextRequest {
  private _json: unknown
  private _url: string
  headers: Headers

  constructor(input: string | { url: string }, init?: { body?: string; headers?: Record<string, string> }) {
    this._url = typeof input === 'string' ? input : input.url
    this.headers = new Headers(init?.headers)
    this._json = init?.body ? JSON.parse(init.body) : null
  }

  async json() {
    return this._json
  }

  get url() {
    return this._url
  }
}
