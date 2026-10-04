import type { ZodError, ZodSchema } from "zod";
import { HttpError } from "./http-error";

export function toValidationError(error: ZodError): HttpError {
  const message = error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
  return new HttpError(400, "VALIDATION_ERROR", message);
}

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}
