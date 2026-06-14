#!/usr/bin/env tsx
/*
  Manage admin accounts in the D1 `admins` table (migration 0003).

  Admins authenticate against this table (see src/lib/core/auth-core.ts); the old
  ADMIN_USERNAME/ADMIN_PASSWORD env vars now only seed the first admin.

  Usage:
    npm run admin -- list
    npm run admin -- add <username>          # prompts for a password (hidden)
    npm run admin -- remove <username>
    npm run admin -- seed                     # create admin from ADMIN_USERNAME/PASSWORD if absent
*/

import fsSync from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import dotenv from 'dotenv';
{
  const cwd = process.cwd();
  const envLocal = path.join(cwd, '.env.local');
  if (fsSync.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
}

import { hashPassword, normalizeUsername } from '../src/lib/core/auth-core';
import {
  getAdminByUsername,
  upsertAdmin,
  deleteAdmin,
  listAdmins,
} from '../src/lib/core/db-core';

/** Read a line from stdin with the typed characters hidden (for passwords). */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const output = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput?: (s: string) => void };
    let first = true;
    output._writeToOutput = (stringToWrite: string) => {
      // Show the prompt once, then mute everything the user types.
      if (first) {
        output.output.write(stringToWrite);
        first = false;
      } else if (stringToWrite.includes('\n') || stringToWrite.includes('\r')) {
        output.output.write('\n');
      }
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function cmdList(): Promise<void> {
  const admins = await listAdmins();
  if (admins.length === 0) {
    console.log('No admins. Add one with: npm run admin -- add <username>');
    return;
  }
  console.log(`${admins.length} admin(s):`);
  for (const a of admins) console.log(`  ${a.username}  (created ${a.created_at})`);
}

async function cmdAdd(rawUsername: string | undefined): Promise<void> {
  if (!rawUsername) throw new Error('Usage: npm run admin -- add <username>');
  const username = normalizeUsername(rawUsername);
  if (!username) throw new Error('Username cannot be empty.');

  const existing = await getAdminByUsername(username);
  const password = await promptHidden(`Password for ${username}: `);
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');
  const confirm = await promptHidden('Confirm password: ');
  if (password !== confirm) throw new Error('Passwords do not match.');

  await upsertAdmin(username, await hashPassword(password));
  console.log(`${existing ? 'Updated' : 'Created'} admin: ${username}`);
}

async function cmdRemove(rawUsername: string | undefined): Promise<void> {
  if (!rawUsername) throw new Error('Usage: npm run admin -- remove <username>');
  const username = normalizeUsername(rawUsername);
  const existing = await getAdminByUsername(username);
  if (!existing) {
    console.log(`No such admin: ${username}`);
    return;
  }
  await deleteAdmin(username);
  console.log(`Removed admin: ${username}`);
}

async function cmdSeed(): Promise<void> {
  const rawUsername = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!rawUsername || !password) {
    console.log('ADMIN_USERNAME / ADMIN_PASSWORD not set; nothing to seed.');
    return;
  }
  const username = normalizeUsername(rawUsername);
  if (await getAdminByUsername(username)) {
    console.log(`Admin already exists, leaving untouched: ${username}`);
    return;
  }
  await upsertAdmin(username, await hashPassword(password));
  console.log(`Seeded admin from env: ${username}`);
}

async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case 'list':
      return cmdList();
    case 'add':
      return cmdAdd(arg);
    case 'remove':
      return cmdRemove(arg);
    case 'seed':
      return cmdSeed();
    default:
      console.log('Usage: npm run admin -- <list|add|remove|seed> [username]');
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
