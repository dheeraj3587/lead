#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function main() {
  const publicDir = resolve(process.cwd(), 'public')
  await mkdir(publicDir, { recursive: true })
  const redirectsPath = resolve(publicDir, '_redirects')
  const content = '/* /index.html 200\n'
  await writeFile(redirectsPath, content, 'utf8')
  console.log(`Wrote SPA fallback to ${redirectsPath}`)
}

main().catch((err) => {
  console.error('Failed to create SPA fallback:', err)
  process.exit(1)
})
