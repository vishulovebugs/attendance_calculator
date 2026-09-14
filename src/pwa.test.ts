/// <reference types="node" />

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(process.cwd(), 'src')

function readAllSourceFiles(): string[] {
  const contents: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (/(\.ts|\.tsx)$/.test(entry)) {
        contents.push(readFileSync(full, 'utf-8'))
      }
    }
  }
  walk(srcDir)
  return contents
}

describe('no Firebase config hardcoded in source', () => {
  const sources = readAllSourceFiles()

  it('contains no literal Firebase API key in any source file', () => {
    const apiKeyRegex = /AIza[0-9A-Za-z_-]{20,}/
    for (const content of sources) {
      expect(content).not.toMatch(apiKeyRegex)
    }
  })

  it('contains no literal Firebase appId in any source file', () => {
    const appIdRegex = /1:[0-9]{6,}:web:[a-f0-9]{10,}/
    for (const content of sources) {
      expect(content).not.toMatch(appIdRegex)
    }
  })

  it('contains no hardcoded apiKey value', () => {
    const literalApiKey = /apiKey:\s*["'][^"']{8,}["']/
    for (const content of sources) {
      expect(content).not.toMatch(literalApiKey)
    }
  })
})