import * as fs from 'fs';
import * as path from 'path';
import { Type } from '@nestjs/common';

interface RuntimeDiscoveryResult {
  handlers: Type<any>[];
  controllers: Type<any>[];
}

/**
 * Runtime auto-discovery that eliminates the need for generated import files
 * This scans and requires files at module initialization time
 */
export class RuntimeAutoDiscovery {
  
  static discoverAllComponents(boundedContextPath: string): RuntimeDiscoveryResult {
    const result: RuntimeDiscoveryResult = {
      handlers: [],
      controllers: [],
    };

    try {
      console.log('🔍 Starting runtime auto-discovery from:', boundedContextPath);

      // Discover handlers
      result.handlers = [
        ...this.discoverHandlers(boundedContextPath, 'application/commands', '.command-handler.js'),
        ...this.discoverHandlers(boundedContextPath, 'application/queries', '.query-handler.js'),
        ...this.discoverHandlers(boundedContextPath, 'application/domain-event-handlers', '.domain-event-handler.js'),
        ...this.discoverHandlers(boundedContextPath, 'interface/integration-events', '.integration-event-handler.js'),
      ];

      // Discover controllers
      result.controllers = this.discoverControllers(boundedContextPath, 'interface/http/controllers', '.controller.js');

      console.log('✅ Runtime auto-discovery complete:', {
        handlers: result.handlers.length,
        controllers: result.controllers.length,
      });

      console.log('📋 Discovered handlers:', result.handlers.map(h => h.name));
      console.log('📋 Discovered controllers:', result.controllers.map(c => c.name));

      return result;
    } catch (error) {
      console.error('❌ Runtime auto-discovery failed:', error);
      return result;
    }
  }

  private static discoverHandlers(basePath: string, subPath: string, suffix: string): Type<any>[] {
    const handlers: Type<any>[] = [];
    const fullPath = path.join(basePath, subPath);

    if (!fs.existsSync(fullPath)) {
      return handlers;
    }

    try {
      const files = this.getAllFilesRecursively(fullPath, suffix);
      
      for (const filePath of files) {
        try {
          // Clear require cache to ensure fresh load
          delete require.cache[require.resolve(filePath)];
          
          const module = require(filePath);
          const handlerClass = this.extractComponentFromModule(module, 'Handler');
          
          if (handlerClass) {
            handlers.push(handlerClass);
            console.log(`✅ Discovered handler: ${handlerClass.name} from ${path.basename(filePath)}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load handler from ${filePath}:`, (error as Error).message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to scan handlers in ${fullPath}:`, (error as Error).message);
    }

    return handlers;
  }

  private static discoverControllers(basePath: string, subPath: string, suffix: string): Type<any>[] {
    const controllers: Type<any>[] = [];
    const fullPath = path.join(basePath, subPath);

    if (!fs.existsSync(fullPath)) {
      return controllers;
    }

    try {
      const files = this.getAllFilesRecursively(fullPath, suffix);
      
      for (const filePath of files) {
        try {
          // Clear require cache to ensure fresh load
          delete require.cache[require.resolve(filePath)];
          
          const module = require(filePath);
          const controllerClass = this.extractComponentFromModule(module, 'Controller');
          
          if (controllerClass) {
            controllers.push(controllerClass);
            console.log(`✅ Discovered controller: ${controllerClass.name} from ${path.basename(filePath)}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load controller from ${filePath}:`, (error as Error).message);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to scan controllers in ${fullPath}:`, (error as Error).message);
    }

    return controllers;
  }

  private static getAllFilesRecursively(dir: string, suffix: string): string[] {
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          files.push(...this.getAllFilesRecursively(fullPath, suffix));
        } else if (item.isFile() && item.name.endsWith(suffix)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to read directory ${dir}:`, (error as Error).message);
    }
    
    return files;
  }

  private static extractComponentFromModule(module: any, typeSuffix: string): Type<any> | null {
    // Look for exports that are classes ending with the specified suffix
    const exports = Object.keys(module);
    
    for (const exportName of exports) {
      const exportValue = module[exportName];
      
      if (typeof exportValue === 'function' && 
          exportValue.prototype &&
          exportName.endsWith(typeSuffix)) {
        return exportValue;
      }
    }

    // Check default export
    const defaultExport = module.default;
    if (defaultExport && 
        typeof defaultExport === 'function' && 
        defaultExport.prototype &&
        defaultExport.name &&
        defaultExport.name.endsWith(typeSuffix)) {
      return defaultExport;
    }

    return null;
  }
}