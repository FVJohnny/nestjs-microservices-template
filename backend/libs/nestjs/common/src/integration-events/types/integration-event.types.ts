/**
 * Parsed integration message structure
 * Used across all integration event listeners (Kafka, Redis, etc.)
 */
export interface ParsedIntegrationMessage {
  parsedMessage: Record<string, unknown>;
  messageId: string;
}