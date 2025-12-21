import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ScriptCpuData } from './parseBootupTime.js';

const __dirname = path.dirname(__filename);
const entities = JSON.parse(fs.readFileSync(path.join(__dirname, 'entities.json'), 'utf-8'));

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

function matchDomain(url: string, patterns: string[]): boolean {
  try {
    const hostname = new URL(url).hostname;
    
    for (const pattern of patterns) {
      // Convert wildcard pattern to regex
      // e.g. *.kameleoon.com -> .*\.kameleoon\.com$
      // kameleoon.com -> ^kameleoon\.com$
      
      let regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '.*'); // Convert * to .*

      // If it starts with *., it matches subdomains. 
      // If it doesn't start with *, it should match exact hostname or maybe we should be more flexible?
      // The requirement says "*.kameleoon.com".
      // Let's assume standard glob-like behavior.
      
      // To be safe and match "third-party-web" style:
      // They often use simple substring or regex.
      // Let's use a robust regex approach.
      
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
    // Invalid URL
    return false;
  }
}

export function mapScriptsToEntities(scripts: ScriptCpuData[]): MappingResult {
  const result: MappingResult = {};

  // Initialize result with 0 for all known entities
  for (const entity of entities) {
    result[entity.name] = {
      cpuTimeMs: 0,
      scripts: []
    };
  }

  for (const script of scripts) {
    let matched = false;
    for (const entity of entities) {
      if (matchDomain(script.url, entity.domains)) {
        result[entity.name].cpuTimeMs += script.cpuTimeMs;
        result[entity.name].scripts.push(script);
        matched = true;
        // A script belongs to one entity. 
        // If multiple entities claim the same domain, the first one wins (or we could support multiple).
        // For now, break after first match.
        break;
      }
    }
  }

  // Round CPU times for cleaner output
  for (const entityName in result) {
    result[entityName].cpuTimeMs = Math.round(result[entityName].cpuTimeMs);
    result[entityName].scripts.forEach(s => s.cpuTimeMs = Math.round(s.cpuTimeMs));
  }

  // Filter out entities with 0 CPU time if desired, or keep them to show 0.
  // The example output shows entities that were found. 
  // Let's keep all configured entities in the output structure as per "Aggregate CPU time per entity"
  // but maybe we only want to show those that have data?
  // The example output:
  // "entities": { "Kameleoon": { ... } }
  // It implies we should show the specific ones we are looking for.
  
  return result;
}
