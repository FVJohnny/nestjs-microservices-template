export interface CqrsMetadata {
  correlationId: string;
  causationId: string;
  userId: string;
}