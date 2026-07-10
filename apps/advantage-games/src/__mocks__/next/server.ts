type MockHeadersInit = Headers | Record<string, string> | [string, string][]

export class NextResponse {
  private _body: unknown
  private _status: number
  headers: Headers
  cookies: {
    get: (name: string) => { name: string; value: string } | undefined
    set: (name: string, value: string, options?: Record<string, unknown>) => void
  }
  private _cookies = new Map<string, { value: string; options?: Record<string, unknown> }>()

  constructor(body: unknown, init?: { status?: number; headers?: MockHeadersInit }) {
    this._body = body
    this._status = init?.status ?? 200
    this.headers = new Headers(init?.headers)
    this.cookies = {
      get: (name) => {
        const cookie = this._cookies.get(name)
        return cookie ? { name, value: cookie.value } : undefined
      },
      set: (name, value, options) => {
        this._cookies.set(name, { value, options })
      },
    }
  }

  static json(body: unknown, init?: { status?: number; headers?: MockHeadersInit }) {
    return new NextResponse(body, init)
  }

  async json() {
    return this._body
  }

  get status() {
    return this._status
  }

  get ok() {
    return this._status >= 200 && this._status < 300
  }

  clone() {
    const response = new NextResponse(this._body, {
      status: this._status,
      headers: this.headers,
    })
    for (const [name, cookie] of this._cookies.entries()) {
      response.cookies.set(name, cookie.value, cookie.options)
    }
    return response
  }
}

export class NextRequest {
  private _json: unknown
  private _url: string
  headers: Headers
  cookies: { get: (name: string) => { name: string; value: string } | undefined }

  constructor(input: string | { url: string }, init?: { body?: string; headers?: Record<string, string> }) {
    this._url = typeof input === 'string' ? input : input.url
    this.headers = new Headers(init?.headers)
    this.cookies = { get: () => undefined }
    this._json = init?.body ? JSON.parse(init.body) : null
  }

  async json() {
    return this._json
  }

  get url() {
    return this._url
  }
}
