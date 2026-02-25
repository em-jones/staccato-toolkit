#!/usr/bin/env bun

/**
 * Migrate Tech Radar tables from design.md body to frontmatter
 * 
 * For each design.md file with a ## Tech Radar table:
 * 1. Parse the table rows
 * 2. Convert to tech-radar frontmatter entries
 * 3. Add tech-radar block to frontmatter
 * 4. Remove ## Tech Radar section from body
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

interface TechRadarEntry {
  name: string;
  quadrant: string;
  ring: string;
  description: string;
  moved?: number;
}

// Map old quadrant names to new schema
function normalizeQuadrant(quadrant: string): string {
  const normalized = quadrant.trim();
  // Map variations
  if (normalized === 'Languages & Frameworks') {
    return 'Frameworks/Libraries';
  }
  if (normalized === 'Platforms') {
    return 'Infrastructure';
  }
  // Return as-is if already valid
  const validQuadrants = ['Infrastructure', 'Languages', 'Frameworks/Libraries', 'Patterns/Processes'];
  if (validQuadrants.includes(normalized)) {
    return normalized;
  }
  // Default fallback
  console.warn(`Unknown quadrant: ${quadrant}, defaulting to Infrastructure`);
  return 'Infrastructure';
}

function parseTableRow(line: string): TechRadarEntry | null {
  // Skip header and separator rows
  if (line.includes('Technology') || line.includes('---')) {
    return null;
  }
  
  // Parse table row: | Technology | Quadrant | Ring | Action | Rationale | Status |
  const cells = line.split('|').map(c => c.trim()).filter(c => c);
  
  if (cells.length < 6) {
    return null;
  }
  
  const [name, quadrant, ring, action, rationale, status] = cells;
  
  // Skip rows where Technology is — or Ring is review-only
  if (name === '—' || ring === 'review-only' || ring === '—') {
    return null;
  }
  
  return {
    name: name.trim(),
    quadrant: normalizeQuadrant(quadrant),
    ring: ring.trim(),
    description: rationale.trim(),
    moved: 0, // Default to unchanged
  };
}

function migrateFile(filePath: string): boolean {
  console.log(`Processing: ${filePath}`);
  
  const content = readFileSync(filePath, 'utf-8');
  
  // Check if file has ## Tech Radar section
  if (!content.includes('## Tech Radar')) {
    console.log(`  ⏭️  No Tech Radar section found, skipping`);
    return false;
  }
  
  // Split frontmatter and body
  const parts = content.split('---\n');
  if (parts.length < 3) {
    console.log(`  ⚠️  Invalid frontmatter structure, skipping`);
    return false;
  }
  
  const frontmatterText = parts[1];
  const body = parts.slice(2).join('---\n');
  
  // Parse frontmatter
  let frontmatter: any;
  try {
    frontmatter = yaml.parse(frontmatterText) || {};
  } catch (e) {
    console.log(`  ⚠️  Failed to parse frontmatter: ${e}`);
    return false;
  }
  
  // Extract Tech Radar table from body
  const techRadarMatch = body.match(/## Tech Radar\n\n([\s\S]*?)(?=\n## |\n$)/);
  if (!techRadarMatch) {
    console.log(`  ⏭️  No Tech Radar table content found, skipping`);
    return false;
  }
  
  const tableSection = techRadarMatch[1];
  const tableLines = tableSection.split('\n').filter(l => l.trim().startsWith('|'));
  
  // Parse table rows
  const techRadarEntries: TechRadarEntry[] = [];
  for (const line of tableLines) {
    const entry = parseTableRow(line);
    if (entry) {
      techRadarEntries.push(entry);
    }
  }
  
  if (techRadarEntries.length === 0) {
    console.log(`  ⏭️  No valid Tech Radar entries found, skipping`);
    return false;
  }
  
  console.log(`  ✓ Found ${techRadarEntries.length} Tech Radar entries`);
  
  // Add tech-radar to frontmatter
  frontmatter['tech-radar'] = techRadarEntries;
  
  // Remove ## Tech Radar section from body
  const newBody = body.replace(/## Tech Radar\n\n[\s\S]*?(?=\n## |\n$)/, '').trim();
  
  // Reconstruct file
  const newFrontmatter = yaml.stringify(frontmatter);
  const newContent = `---\n${newFrontmatter}---\n\n${newBody}\n`;
  
  // Write back
  writeFileSync(filePath, newContent, 'utf-8');
  console.log(`  ✅ Migrated successfully`);
  
  return true;
}

function findDesignFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        findDesignFiles(fullPath, files);
      } else if (entry === 'design.md' || (entry.endsWith('.md') && fullPath.includes('/docs/adrs/'))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors (e.g., permission denied)
  }
  
  return files;
}

function main() {
  console.log('🔍 Finding design.md files with Tech Radar tables...\n');
  
  // Find all design.md files
  const searchDirs = [
    'openspec/changes',
    'src',
  ];
  
  let totalMigrated = 0;
  const allFiles: string[] = [];
  
  for (const dir of searchDirs) {
    findDesignFiles(dir, allFiles);
  }
  
  console.log(`Found ${allFiles.length} potential files to check\n`);
  
  for (const file of allFiles) {
    if (migrateFile(file)) {
      totalMigrated++;
    }
  }
  
  console.log(`\n✅ Migration complete: ${totalMigrated} files migrated`);
}

main();
