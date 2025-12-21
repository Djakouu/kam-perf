import * as fs from 'fs';
import * as path from 'path';
import { ScriptCpuData } from './parseBootupTime';

// Hardcoded entities for simplicity in worker, or load from file
const entities = [
    {
        "name": "Kameleoon",
        "domains": [
            "*.kameleoon.com", 
            "*.kameleoon.eu", 
            "*.kameleoon.io",
            "*/static-proxy/kameleoon/script.js"
        ]
    }
];

interface EntityDefinition {
  name: string;
  domains: string[];
  homepage?: string;
  categories?: string[];
}

export interface EntityResult {
  cpuTimeMs: number;
  scripts: ScriptCpuData[];
}

export interface MappingResult {
  [entityName: string]: EntityResult;
}

function matchUrl(url: string, patterns: string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    
    for (const pattern of patterns) {
      // If pattern contains '/', check against full URL
      if (pattern.includes('/')) {
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          
          if (new RegExp(regexPattern).test(url)) {
              return true;
          }
          continue;
      }

      // Hostname matching
      let regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');

      if (!pattern.startsWith('*')) {
          regexPattern = '^' + regexPattern + '$';
      } else {
          regexPattern = regexPattern + '$';
      }

      const regex = new RegExp(regexPattern);
      if (regex.test(hostname)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

export function mapScriptsToEntities(scripts: ScriptCpuData[]): MappingResult {
  const result: MappingResult = {};

  for (const entity of entities) {
    result[entity.name] = {
      cpuTimeMs: 0,
      scripts: []
    };
  }

  for (const script of scripts) {
    for (const entity of entities) {
      if (matchUrl(script.url, entity.domains)) {
        result[entity.name].cpuTimeMs += script.cpuTimeMs;
        result[entity.name].scripts.push(script);
        break;
      }
    }
  }

  for (const entityName in result) {
    result[entityName].cpuTimeMs = Math.round(result[entityName].cpuTimeMs);
    result[entityName].scripts.forEach(s => s.cpuTimeMs = Math.round(s.cpuTimeMs));
  }

  return result;
}
