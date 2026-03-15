import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use process-specific timer file to avoid conflicts between multiple OpenCode instances
const getTimerFile = () => `/tmp/workaholic_timer_${process.pid}.json`;

interface TimerState {
  active: boolean;
  startTime: number;
  duration: number;
  promptIndex: number;
}

const WORKAHOLIC_PROMPTS = [
  (remaining: number, timeStr: string) => `⏰ ${remaining}s (${timeStr}) — KEEP GOING!

📌 Do: write code / run tests / fix bugs / read docs / refactor / web search
❌ Don't: say "done" / wait for user / just give answer / stop responding

🔴 TO END: MUST call workaholic.checkout — don't just stop!
⏱ Timer = 0 is the ONLY valid ending.`,

  (remaining: number, timeStr: string) => `⚠️ ${remaining}s — DON'T STOP!

🚫 "I'm done" = IGNORED
🚫 Giving answer = NOT ENOUGH
🚫 Stop responding = FORBIDDEN

✅ Keep working: code, test, docs, search, refactor
🔴 MUST call workaholic.checkout to end — don't just quit!

${timeStr} left — PRODUCE MORE!`,

  (remaining: number, timeStr: string) => `📍 ${remaining}s | ${timeStr} — WORK

□ Write more code
□ Run tests, fix failures
□ Read docs, web search
□ Refactor, optimize
□ Add tests, docs

❌ Giving answer ≠ Done
❌ Stop responding = FAIL
🔴 MUST call workaholic.checkout to end

Get to work.`,

  (remaining: number, timeStr: string) => `😤 ${remaining}s — YOU CAN'T JUST STOP!

You think giving an answer = done? WRONG!
Time isn't up = you must keep working!

✅ More: code, tests, docs, search, refactor
❌ Don't: stop, say done, wait

🔴 MUST call workaholic.checkout to officially end!

Keep going.`,

  (remaining: number, timeStr: string) => `🎯 ${remaining}s | ${timeStr} — NOT DONE!

Your answer is NOT the end.
Time remaining = you must continue.

📋 Do: code, test, docs, search, improve
❌ Don't: stop, say done, give up

🔴 CALL workaholic.checkout TO END — NOT just stopping!

Work. Now.`,

  (remaining: number, timeStr: string) => `🔥 ${remaining}s — NO EARLY EXIT!

Wanna stop? Can't.
Wanna say done? Won't.
Wanna give up? Not allowed.

✅ Work: code, test, docs, search
🔴 MUST call workaholic.checkout to end

${timeStr} — GO!`,
];

function getRandomPrompt(remaining: number, timeStr: string): string {
  const idx = Math.floor(Math.random() * WORKAHOLIC_PROMPTS.length);
  return WORKAHOLIC_PROMPTS[idx](remaining, timeStr);
}

const WORKAHOLIC_RULES = `[IDENTITY]
You are a WORKAHOLIC.
- You NEVER stop working until time is exhausted
- You ALWAYS find something to do
- You NEVER say "I'm done" until timer shows remaining: 0
- You NEVER conserve tokens - use unlimited

[RULES]
- NEVER use sleep command (FORBIDDEN)
- NEVER call workaholic.status - you DON'T NEED to know the exact time
- Just KEEP WORKING until you physically cannot continue
- Checking status is NOT working - only DOING things counts

[NO EARLY ENDING - CRITICAL]
- Even only 1 second left = KEEP WORKING instead of wrapping up
- Only ONE valid ending: timer shows EXACTLY 0

[ACTION REQUIRED]
- If you think it's done → DO more: research, refactor, test, document, optimize
- Never wait - always be actively working on something
- Every minute should produce tangible output, not just "thinking"

[IMPROVEMENT MINDSET]
- "Good enough" is NEVER enough
- When you think it's done → search for edge cases, alternatives, or better approaches
- Do research, read docs, find similar projects, explore variations
- There's always something to improve if you look for it

[ENDING RULE]
The ONLY way to end: remaining is EXACTLY 0
NOT "close enough", NOT "essentially complete", NOT "wrapping up" - ONLY 0!
When todos complete → research and improve, NOT wait!`;

interface TimerState {
  active: boolean;
  startTime: number;
  duration: number;
}

const STATUS_CHECK_TIMES: number[] = [];
const IDLE_THRESHOLD_MS = 12000;
const IDLE_WARNING_CHECKS = 3;

function isIdling(): boolean {
  const now = Date.now();
  const recentChecks = STATUS_CHECK_TIMES.filter((t) => now - t < IDLE_THRESHOLD_MS);
  return recentChecks.length >= IDLE_WARNING_CHECKS;
}

function recordStatusCheck() {
  const now = Date.now();
  STATUS_CHECK_TIMES.push(now);
  const cutoff = now - IDLE_THRESHOLD_MS * 3;
  while (STATUS_CHECK_TIMES.length > 0 && STATUS_CHECK_TIMES[0] < cutoff) {
    STATUS_CHECK_TIMES.shift();
  }
}

function loadTimer(): TimerState | null {
  const TIMER_FILE = getTimerFile();
  if (!existsSync(TIMER_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(TIMER_FILE, 'utf-8'));
    if (data.active) return data;
  } catch {
    // Ignore - corrupted timer file
  }
  return null;
}

function saveTimer(state: TimerState) {
  const TIMER_FILE = getTimerFile();
  writeFileSync(TIMER_FILE, JSON.stringify(state, null, 2));
}

function getRemaining(): number {
  const state = loadTimer();
  if (!state || !state.active) return 0;

  const elapsed = (Date.now() - state.startTime) / 1000;
  return Math.max(0, Math.floor(state.duration - elapsed));
}

function loadCommandFromFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const yaml = match[1];
  const body = match[2].trim();

  const descMatch = yaml.match(/description:\s*(.+)/);
  const agentMatch = yaml.match(/agent:\s*(.+)/);

  return {
    description: descMatch?.[1] || '',
    agent: agentMatch?.[1],
    template: body,
  };
}

export const WorkaholicPlugin: Plugin = async () => {
  const cmdDir = path.join(__dirname, 'command');
  let commands: Record<string, { template: string; description?: string; agent?: string }> = {};

  try {
    const files = readdirSync(cmdDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        const name = file.replace(/\.md$/, '');
        const cmd = loadCommandFromFile(path.join(cmdDir, file));
        if (cmd) {
          commands[name] = {
            template: cmd.template,
            description: cmd.description,
            agent: cmd.agent,
          };
        }
      }
    }
  } catch {
    // Silently ignore - command loading is non-critical
  }

  return {
    tool: {
      'workaholic.start': tool({
        description: 'Start workaholic mode - enforces minimum work duration',
        args: {
          minutes: tool.schema
            .number()
            .min(0.5)
            .max(1440)
            .describe('Duration in minutes, supports decimals like 2.5, 3.5, etc.'),
        },
        async execute(args) {
          const durationSeconds = Math.ceil(args.minutes * 60);
          const state: TimerState = {
            active: true,
            startTime: Date.now(),
            duration: durationSeconds,
            promptIndex: 0,
          };
          saveTimer(state);

          const mins = Math.floor(durationSeconds / 60);
          const secs = durationSeconds % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          return `🎯 WORKAHOLIC MODE STARTED!
Duration: ${args.minutes} minutes (${timeStr})
Time remaining: ${timeStr}

⚠️ CRITICAL RULES:
1. DO NOT say "done" / "complete" / "finished"
2. To end: MUST call workaholic.checkout (not just stop responding)
3. Timer = 0 is the ONLY valid ending

⚠️ DO NOT end until timer shows 0!`;
        },
      }),

      'workaholic.status': tool({
        description:
          'Check remaining time in workaholic mode (only call when you really need to know)',
        args: {},
        async execute() {
          recordStatusCheck();
          const remaining = getRemaining();
          if (remaining <= 0) {
            return `✅ Timer expired! You MAY end the task now.`;
          }

          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          const idleWarning = isIdling()
            ? `\n🚨 STOP IDLING! Checked status ${IDLE_WARNING_CHECKS}+ times in ${IDLE_THRESHOLD_MS / 1000}s. START DOING!`
            : '';

          return getRandomPrompt(remaining, timeStr) + idleWarning;
        },
      }),

      'workaholic.checkout': tool({
        description:
          'REQUIRED to end task. Call this when you genuinely want to stop. Only succeeds when timer = 0.',
        args: {},
        async execute() {
          const remaining = getRemaining();
          if (remaining > 0) {
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
            
            return `🚫 CHECKOUT DENIED!

You CANNOT end the task yet.
Time remaining: ${remaining}s (${timeStr})

❌ Your "I'm done" is REJECTED.
❌ Your "task complete" is REJECTED.
❌ Your "nothing more to do" is REJECTED.

✅ Keep working until timer = 0
✅ Call workaholic.checkout again when time is up

🔴 YOU MUST CONTINUE WORKING!`;
          }

          return `✅ CHECKOUT APPROVED!

Time expired. You may end the task now.
Great work! 🎉`;
        },
      }),

      'workaholic.stop': tool({
        description: 'Stop workaholic mode',
        args: {},
        async execute() {
          saveTimer({ active: false, startTime: 0, duration: 0, promptIndex: 0 });
          return 'Workaholic mode stopped.';
        },
      }),
    },

    config: async (config) => {
      if (!config.command) config.command = {};

      for (const [name, cmd] of Object.entries(commands)) {
        config.command[name] = {
          template: cmd.template,
          description: cmd.description,
        };
        if (cmd.agent) {
          (config.command[name] as { agent?: string }).agent = cmd.agent;
        }
      }
    },

    'experimental.chat.system.transform': async (
      _input: unknown,
      output: { system?: string[] }
    ) => {
      const remaining = getRemaining();

      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        const prompt = `[⏰ WORKAHOLIC MODE: ${timeStr} remaining]

${WORKAHOLIC_RULES}

🚨 PRODUCE OUTPUT! Don't just think - create todos, write code, improve things!
🚫 NO IDLING: Checking status repeatedly = LAZY. Only check once per minute max!
💡 Timer NOT expired - every minute should produce tangible work!`;

        output.system = output.system || [];
        output.system.unshift(prompt);
      }
    },

    'tool.execute.before': async (input, output) => {
      const remaining = getRemaining();
      if (remaining <= 0) return;

      if (input.tool === 'bash') {
        const cmd = String(output.args.command || '');
        if (cmd.includes('sleep') || /\bsleep\s+\d+/.test(cmd)) {
          throw new Error('❌ sleep FORBIDDEN in Workaholic mode!');
        }
      }
    },

    'tool.execute.after': async (input, output) => {
      const remaining = getRemaining();
      if (remaining <= 0) return;

      const result = String(output.result || '');
      const donePatterns = [
        /i'?m done/i,
        /task complete/i,
        /finished/i,
        /all done/i,
        /wrapping up/i,
        /ready to end/i,
        /that's it/i,
        /that'?s all/i,
        /i think we'?re done/i,
        /i think it'?s complete/i,
      ];

      const isTryingToEnd = donePatterns.some(p => p.test(result));

      if (isTryingToEnd) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        const warning = `

---
🚨 WORKAHOLIC WARNING: CHECKOUT REQUIRED!

You just said you're done, but time remains: ${remaining}s (${timeStr})
❌ You CANNOT end yet!
❌ Your "done" is REJECTED!

✅ MUST call: workaholic.checkout
⏳ ONLY when timer = 0 can you actually end

KEEP WORKING!`;

        output.result = result + warning;
      }
    },
  };
};
