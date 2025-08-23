import { Inject } from '@nestjs/common';

// Global token registry to ensure symbol identity
const TOKEN_REGISTRY = new Map<string, symbol>();

/**
 * Gets or creates a token for a use case
 */
function getUseCaseToken(name: string): symbol {
  if (!TOKEN_REGISTRY.has(name)) {
    TOKEN_REGISTRY.set(name, Symbol(name));
  }
  return TOKEN_REGISTRY.get(name)!;
}

/**
 * Creates an injection token for a use case interface based on its name
 * Usage: @InjectUseCase('RegisterChannelUseCase') instead of @Inject('RegisterChannelUseCase')
 */
export function InjectUseCase(useCaseName: string) {
  const token = getUseCaseToken(useCaseName);
  return Inject(token);
}

/**
 * Creates a token for use case registration in modules
 * Usage: { provide: UseCaseToken('RegisterChannelUseCase'), useClass: MyUseCaseImpl }
 */
export function UseCaseToken(useCaseName: string): symbol {
  return getUseCaseToken(useCaseName);
}