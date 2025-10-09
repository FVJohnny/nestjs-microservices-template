import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CorrelationLogger } from '../logger';

@Injectable()
export class FileSystemDomainEventDiscoveryService {
  private readonly logger = new CorrelationLogger(FileSystemDomainEventDiscoveryService.name);

  async discoverDomainEvents(): Promise<Set<string>> {
    const eventNames = new Set<string>();
    const serviceRoot = this.findServiceRoot();

    // Try multiple possible paths for bounded contexts
    const possiblePaths = [
      path.join(serviceRoot, 'src', 'bounded-contexts'), // Development
      path.join(serviceRoot, 'dist', 'bounded-contexts'), // Simple build
      path.join(
        serviceRoot,
        'dist',
        'services',
        path.basename(serviceRoot),
        'src',
        'bounded-contexts',
      ), // NX monorepo build
    ];

    let boundedContextsPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        boundedContextsPath = possiblePath;
        break;
      }
    }

    if (!boundedContextsPath) {
      this.logger.warn(
        `Bounded contexts directory not found. Checked paths: ${possiblePaths.join(', ')} (cwd: ${process.cwd()}, serviceRoot: ${serviceRoot})`,
      );
      return eventNames;
    }

    this.logger.debug(`Using bounded contexts path: ${boundedContextsPath}`);

    for (const contextName of fs.readdirSync(boundedContextsPath)) {
      const eventsPath = path.join(boundedContextsPath, contextName, 'domain', 'events');

      if (fs.existsSync(eventsPath)) {
        this.scanEventsDirectory(eventsPath, eventNames);
      }
    }

    this.logger.log(
      `✅ Discovered ${eventNames.size} domain events: ${Array.from(eventNames).join(', ')}`,
    );
    return eventNames;
  }

  private findServiceRoot(): string {
    // In production (Docker), the app is typically in /app/backend/services/service-1
    // In development, it's in the workspace root
    let dir = process.cwd();

    // First, try to find package.json by going up the directory tree
    while (dir !== '/' && !fs.existsSync(path.join(dir, 'package.json'))) {
      dir = path.dirname(dir);
    }

    // If we're in a build output directory (dist), go up one level
    if (path.basename(dir) === 'dist') {
      dir = path.dirname(dir);
    }

    return dir;
  }

  private scanEventsDirectory(eventsPath: string, eventNames: Set<string>): void {
    try {
      const files = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith('.domain-event.ts') || file.endsWith('.domain-event.js'))
        .map((file) =>
          this.toPascalCase(file.replace('.domain-event.ts', '').replace('.domain-event.js', '')),
        )
        .filter(Boolean)
        .map((name) => `${name}_DomainEvent`);

      files.forEach((eventName) => eventNames.add(eventName));
    } catch (error) {
      this.logger.error(`Could not scan ${eventsPath}:`, error as Error);
    }
  }

  private toPascalCase(kebabCase: string): string {
    return kebabCase
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
