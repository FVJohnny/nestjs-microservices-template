import { Injectable, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class FileSystemDomainEventDiscoveryService {
  private readonly logger = new Logger(
    FileSystemDomainEventDiscoveryService.name,
  );

  async discoverDomainEvents(): Promise<Set<string>> {
    const eventNames = new Set<string>();
    const serviceRoot = this.findServiceRoot();
    const boundedContextsPath = path.join(
      serviceRoot,
      "src",
      "bounded-contexts",
    );

    if (!fs.existsSync(boundedContextsPath)) {
      this.logger.warn(
        `Bounded contexts directory not found: ${boundedContextsPath}`,
      );
      return eventNames;
    }

    for (const contextName of fs.readdirSync(boundedContextsPath)) {
      const eventsPath = path.join(
        boundedContextsPath,
        contextName,
        "domain",
        "events",
      );

      if (fs.existsSync(eventsPath)) {
        this.scanEventsDirectory(eventsPath, eventNames);
      }
    }

    this.logger.log(
      `✅ Discovered ${eventNames.size} domain events: ${Array.from(eventNames).join(", ")}`,
    );
    return eventNames;
  }

  private findServiceRoot(): string {
    let dir = process.cwd();
    while (dir !== "/" && !fs.existsSync(path.join(dir, "package.json"))) {
      dir = path.dirname(dir);
    }
    return dir;
  }

  private scanEventsDirectory(
    eventsPath: string,
    eventNames: Set<string>,
  ): void {
    try {
      const files = fs
        .readdirSync(eventsPath)
        .filter((file) => file.endsWith(".domain-event.ts"))
        .map((file) => this.toPascalCase(file.replace(".domain-event.ts", "")))
        .filter(Boolean)
        .map((name) => `${name}DomainEvent`);

      files.forEach((eventName) => eventNames.add(eventName));
    } catch (error) {
      this.logger.debug(`Could not scan ${eventsPath}:`, error);
    }
  }

  private toPascalCase(kebabCase: string): string {
    return kebabCase
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }
}
