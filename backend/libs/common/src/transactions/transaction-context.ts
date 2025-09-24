/**
 * Marker interface representing an infrastructure-specific transaction context.
 *
 * Concrete implementations (Mongo sessions, SQL query runners, etc.) live in infrastructure adapters
 * and are surfaced through this abstraction so that the application layer stays persistence-agnostic.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TransactionContext {}
