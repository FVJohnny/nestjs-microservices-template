import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { PostgreSQLConfigService } from "./postgresql-config.service";

@ApiTags("PostgreSQL")
@Controller("postgresql")
export class PostgreSQLController {
  constructor(private readonly configService: PostgreSQLConfigService) {}

  @Get("health")
  @ApiOperation({
    summary: "Check PostgreSQL connection health",
    description: "Returns the health status of the PostgreSQL connection",
  })
  @ApiResponse({
    status: 200,
    description: "PostgreSQL health status",
    schema: {
      type: "object",
      properties: {
        status: { type: "string" },
        config: { type: "object" },
        uptime: { type: "number" },
      },
    },
  })
  async getHealth() {
    try {
      const config = this.configService.getPostgreSQLConfig();

      return {
        status: "healthy",
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          ssl: !!config.ssl,
        },
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
        uptime: process.uptime(),
      };
    }
  }

  @Get("stats")
  @ApiOperation({
    summary: "Get PostgreSQL connection statistics",
    description: "Returns detailed statistics about the PostgreSQL connection",
  })
  @ApiResponse({
    status: 200,
    description: "PostgreSQL connection statistics",
    schema: {
      type: "object",
      properties: {
        service: { type: "string" },
        environment: { type: "object" },
        uptime: { type: "number" },
      },
    },
  })
  async getStats() {
    try {
      const config = this.configService.getPostgreSQLConfig();

      return {
        service: "PostgreSQL",
        environment: {
          host: config.host,
          port: config.port,
          database: config.database,
          synchronize: config.synchronize,
          logging: config.logging,
          ssl: !!config.ssl,
        },
        uptime: process.uptime(),
        connectionUrl: this.configService
          .getConnectionUrl()
          .replace(/:[^:@]+@/, ":***masked***@"),
      };
    } catch (error) {
      return {
        service: "PostgreSQL",
        error: error instanceof Error ? error.message : String(error),
        uptime: process.uptime(),
      };
    }
  }
}
