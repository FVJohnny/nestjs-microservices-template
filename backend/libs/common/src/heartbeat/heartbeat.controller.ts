import { Controller, Get } from "@nestjs/common";

@Controller()
export class HeartbeatController {
  @Get("health")
  getHealth(): string {
    return "ok";
  }

  @Get("health/environment")
  getEnvironment(): { environment: string; timestamp: string } {
    const environment = process.env.NODE_ENV || "development";
    return {
      environment,
      timestamp: new Date().toISOString(),
    };
  }
}
