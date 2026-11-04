import { STATUS_CODES } from "node:http";

/** An error that is safe to show to the client, with an HTTP status. */
export class HttpError extends Error {
  readonly status: number;
  readonly title: string;

  constructor(status: number, detail?: string) {
    const title = STATUS_CODES[status] ?? "Error";
    super(detail ?? title);
    this.name = "HttpError";
    this.status = status;
    this.title = title;
  }
}
