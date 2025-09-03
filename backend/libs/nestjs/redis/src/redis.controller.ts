import { Controller, Get, Param,Query } from '@nestjs/common';
import { ApiOperation, ApiParam,ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RedisService } from './redis.service';

@ApiTags('Redis')
@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('health')
  @ApiOperation({ 
    summary: 'Check Redis connection health',
    description: 'Performs a ping to Redis and returns connection status' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis health check result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        ping: { type: 'string', example: 'PONG' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getHealth() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        return {
          status: 'unavailable',
          message: 'Redis client not initialized',
          timestamp: new Date().toISOString(),
        };
      }
      const ping = await client.ping();
      return {
        status: 'healthy',
        ping,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('info')
  @ApiOperation({ 
    summary: 'Get Redis server information',
    description: 'Returns detailed Redis server information including memory, clients, and performance metrics' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis server information',
    schema: {
      type: 'object',
      properties: {
        server: { type: 'object' },
        memory: { type: 'object' },
        clients: { type: 'object' },
        stats: { type: 'object' },
        keyspace: { type: 'object' },
      },
    },
  })
  async getInfo() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      const info = await client.info();
      
      return info.split('\r\n\r\n').reduce((acc, section) => {
        const lines = section.split('\r\n');
        const sectionName = lines[0]?.replace('# ', '').toLowerCase();
        
        if (sectionName && lines.length > 1) {
          acc[sectionName] = this.parseInfoSection(lines.slice(1).join('\r\n'));
        }
        
        return acc;
      }, {} as Record<string, Record<string, string | number>>);
    } catch (error) {
      this.handleError('get Redis info', error);
    }
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get Redis usage statistics',
    description: 'Returns application-specific Redis usage statistics including key counts and memory usage' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis usage statistics',
    schema: {
      type: 'object',
      properties: {
        totalKeys: { type: 'number', example: 150 },
        keysByPattern: { type: 'object' },
        memoryUsage: { type: 'object' },
        uptime: { type: 'number', example: 86400 },
        connectedClients: { type: 'number', example: 5 },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getStats() {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      
      // Get basic info
      const info = await client.info('memory');
      const serverInfo = await client.info('server');
      const clientsInfo = await client.info('clients');
      
      // Count keys by patterns
      const allKeys = await this.redisService.scan('*');
      const keyPatterns = {
        'channel:*': await this.redisService.scan('channel:*'),
        'user_channels:*': await this.redisService.scan('user_channels:*'),
        'other': [] as string[],
      };
      
      // Categorize keys
      allKeys.forEach(key => {
        if (key.startsWith('channel:')) {
          return; // Already counted
        } else if (key.startsWith('user_channels:')) {
          return; // Already counted
        } else {
          keyPatterns.other.push(key);
        }
      });

      const memory = this.parseInfoSection(info);

      // Parse uptime
      const serverLines = serverInfo.split('\r\n');
      const uptime = serverLines.find(line => line.startsWith('uptime_in_seconds:'))
        ?.split(':')[1] || '0';

      // Parse clients
      const clientLines = clientsInfo.split('\r\n');
      const connectedClients = clientLines.find(line => line.startsWith('connected_clients:'))
        ?.split(':')[1] || '0';

      return {
        totalKeys: allKeys.length,
        keysByPattern: {
          'channel:*': keyPatterns['channel:*'].length,
          'user_channels:*': keyPatterns['user_channels:*'].length,
          'other': keyPatterns.other.length,
        },
        keyExamples: {
          'channel:*': keyPatterns['channel:*'].slice(0, 5),
          'user_channels:*': keyPatterns['user_channels:*'].slice(0, 5),
          'other': keyPatterns.other.slice(0, 5),
        },
        memoryUsage: {
          usedMemory: memory.used_memory,
          usedMemoryHuman: memory.used_memory_human,
          usedMemoryRss: memory.used_memory_rss,
          usedMemoryPeak: memory.used_memory_peak,
          usedMemoryPeakHuman: memory.used_memory_peak_human,
        },
        uptime: parseInt(uptime, 10),
        connectedClients: parseInt(connectedClients, 10),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.handleError('get Redis stats', error);
    }
  }

  @Get('keys')
  @ApiOperation({ 
    summary: 'Get Redis keys by pattern',
    description: 'Returns keys matching the specified pattern (use with caution in production)' 
  })
  @ApiQuery({ 
    name: 'pattern', 
    description: 'Redis key pattern (e.g., "channel:*", "user_channels:*")',
    example: 'channel:*',
    required: false 
  })
  @ApiQuery({ 
    name: 'limit', 
    description: 'Maximum number of keys to return',
    example: 10,
    required: false 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of Redis keys matching the pattern',
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', example: 'channel:*' },
        keys: { type: 'array', items: { type: 'string' } },
        count: { type: 'number', example: 5 },
        limited: { type: 'boolean', example: false },
      },
    },
  })
  async getKeys(
    @Query('pattern') pattern: string = '*',
    @Query('limit') limitStr?: string
  ) {
    try {
      const limit = limitStr ? parseInt(limitStr, 10) : undefined;
      const keys = await this.redisService.scan(pattern);
      
      const limitedKeys = limit ? keys.slice(0, limit) : keys;
      
      return {
        pattern,
        keys: limitedKeys,
        count: limitedKeys.length,
        totalCount: keys.length,
        limited: limit ? keys.length > limit : false,
      };
    } catch (error) {
      this.handleError('get Redis keys', error);
    }
  }

  @Get('key/:key')
  @ApiOperation({ 
    summary: 'Get Redis key information',
    description: 'Returns information about a specific Redis key including type, TTL, and value' 
  })
  @ApiParam({ 
    name: 'key', 
    description: 'Redis key name',
    example: 'channel:123e4567-e89b-12d3-a456-426614174000' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Redis key information',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        exists: { type: 'boolean' },
        type: { type: 'string' },
        ttl: { type: 'number' },
        value: { type: 'any' },
        size: { type: 'number' },
      },
    },
  })
  async getKeyInfo(@Param('key') key: string) {
    try {
      const client = this.redisService.getClient();
      if (!client) {
        throw new Error('Redis client not initialized');
      }
      
      const exists = await this.redisService.exists(key);
      if (!exists) {
        return {
          key,
          exists: false,
          type: null,
          ttl: null,
          value: null,
          size: 0,
        };
      }

      const type = await client.type(key);
      const ttl = await client.ttl(key);
      const { value, size } = await this.getKeyValue(type, key);

      return {
        key,
        exists: true,
        type,
        ttl: ttl === -1 ? null : ttl, // -1 means no expiration
        value,
        size,
      };
    } catch (error) {
      this.handleError('get key info', error);
    }
  }

  private parseInfoSection(info: string): Record<string, string | number> {
    return info.split('\r\n').reduce((acc, line) => {
      const [key, value] = line.split(':');
      if (key && value !== undefined) {
        acc[key] = isNaN(Number(value)) ? value : Number(value);
      }
      return acc;
    }, {} as Record<string, string | number>);
  }

  private async getKeyValue(type: string, key: string): Promise<{ value: unknown; size: number }> {
    const client = this.redisService.getClient();
    if (!client) throw new Error('Redis client not initialized');

    switch (type) {
      case 'string': {
        const stringValue = await this.redisService.get(key);
        
        try {
          const objValue = JSON.parse(stringValue || '');
          return { value: objValue, size: Object.keys(objValue).length };
        } catch {
          return { value: stringValue, size: stringValue?.length || 0 };
        }
      }
      case 'hash': {
        const hashValue = await this.redisService.hgetall(key);
        return {
          value: hashValue,
          size: Object.keys(hashValue).length
        };
      }
      case 'set': {
        const setValue = await this.redisService.smembers(key);
        return {
          value: setValue,
          size: setValue?.length ?? 0
        };
      }
      case 'list': {
        const listLength = await client.llen(key);
        const listValue = await client.lrange(key, 0, Math.min(listLength - 1, 99));
        return {
          value: listValue,
          size: listLength
        };
      }
      default:
        return {
          value: `Unsupported type: ${type}`,
          size: 0
        };
    }
  }

  private handleError(operation: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to ${operation}: ${message}`);
  }
}