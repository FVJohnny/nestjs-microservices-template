import { HttpStatus } from "@nestjs/common";

import type { Metadata } from "../utils/metadata";
import { BaseException } from "./base.exception";

export class NotFoundException extends BaseException {
  constructor(metadata?: Metadata) {
    super(`Entity not found`, "ENTITY_NOT_FOUND", HttpStatus.NOT_FOUND, {
      ...metadata,
    });
  }
}

export class AlreadyExistsException extends BaseException {
  constructor(field: string, value: string, metadata?: Metadata) {
    super(
      `Entity already exists with ${field}: ${value}`,
      "ENTITY_ALREADY_EXISTS",
      HttpStatus.CONFLICT,
      { ...metadata },
    );
  }
}

export class InfrastructureException extends BaseException {
  constructor(
    operation: string,
    details: string,
    cause: Error,
    metadata?: Metadata,
  ) {
    super(
      `Infrastructure operation '${operation}' failed: ${details}`,
      "INFRASTRUCTURE_ERROR",
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, details, ...metadata },
      cause,
    );
  }
}
