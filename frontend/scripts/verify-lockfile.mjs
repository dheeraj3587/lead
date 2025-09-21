#!/usr/bin/env node
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve } from 'node:path'

async function main() {
  const lockfile = resolve(process.cwd(), 'package-lock.json')
  try {
    await access(lockfile, constants.R_OK)
  } catch {
    console.error('Error: package-lock.json is missing. Please commit the lockfile and use `npm ci` in CI.')
    process.exit(1)
  }
  console.log('Lockfile present. Use `npm ci` for reproducible installs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
