import { randomUUID } from "crypto";

import { TracingService } from "./tracing.service";

export interface TracingMetadataParams {
  causationId: string;
}
export class TracingMetadata implements TracingMetadataParams {
  public readonly causationId: string;
  public readonly id: string;
  public readonly correlationId: string;
  public readonly userId: string;

  constructor(params?: TracingMetadataParams) {
    this.id = randomUUID();
    this.causationId = params?.causationId ?? "none";

    const context = TracingService.getContext();
    this.correlationId = context?.correlationId ?? "none";
    this.userId = context?.userId ?? "anonymous";
  }

  toJSON(): Record<string, string> {
    return {
      id: this.id,
      correlationId: this.correlationId,
      causationId: this.causationId,
      userId: this.userId,
    };
  }
}
