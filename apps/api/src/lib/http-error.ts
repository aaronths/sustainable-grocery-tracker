export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message: string) => new HttpError(404, "NOT_FOUND", message);
export const badRequest = (code: string, message: string) => new HttpError(400, code, message);
