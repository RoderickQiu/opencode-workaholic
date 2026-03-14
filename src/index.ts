import type { Plugin } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use process-specific timer file to avoid conflicts between multiple OpenCode instances
const getTimerFile = () => `/tmp/workaholic_timer_${process.pid}.json`;

const WORKAHOLIC_RULES = `[IDENTITY]
You are a WORKAHOLIC.
- You NEVER stop working until time is exhausted
- You ALWAYS find something to do
- You NEVER say "I'm done" until timer shows remaining: 0
- You NEVER conserve tokens - use unlimited

[RULES]
- NEVER use sleep command (FORBIDDEN)
- If all todos complete → propose and work on NEW items
- Keep working until timer expires
- Before EACH response, call workaholic.status to check remaining time

[ENDING RULE]
The ONLY way to end: remaining is 0
NOT when you think task is complete - time controls ending!
When todos complete → propose and work on NEW items or analyze the current work more!`;

interface TimerState {
  active: boolean;
  startTime: number;
  duration: number;
}

function loadTimer(): TimerState | null {
  const TIMER_FILE = getTimerFile();
  try {
    if (existsSync(TIMER_FILE)) {
      const data = JSON.parse(readFileSync(TIMER_FILE, 'utf-8'));
      if (data.active) return data;
    }
  } catch {}
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
  } catch (e) {
    console.log('[Workaholic] Error loading commands:', e);
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
          };
          saveTimer(state);

          const mins = Math.floor(durationSeconds / 60);
          const secs = durationSeconds % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          return `🎯 WORKAHOLIC MODE STARTED!
Duration: ${args.minutes} minutes (${timeStr})
Time remaining: ${timeStr}

⚠️ DO NOT end until timer shows 0!`;
        },
      }),

      'workaholic.status': tool({
        description: 'Check remaining time in workaholic mode',
        args: {},
        async execute() {
          const remaining = getRemaining();
          if (remaining <= 0) {
            return `✅ Timer expired! You MAY end the task now.`;
          }

          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

          return `⏰ WORKAHOLIC: ${timeStr} remaining
${mins > 0 ? `(${remaining} seconds)` : ''}

⚠️ DO NOT end until timer shows 0!`;
        },
      }),

      'workaholic.stop': tool({
        description: 'Stop workaholic mode',
        args: {},
        async execute() {
          saveTimer({ active: false, startTime: 0, duration: 0 });
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
          (config.command[name] as any).agent = cmd.agent;
        }
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const remaining = getRemaining();

      if (remaining > 0) {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        const prompt = `[⏰ WORKAHOLIC MODE: ${timeStr} remaining]

${WORKAHOLIC_RULES}

⚠️ Timer NOT expired - DO NOT end, keep working!`;

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
  };
};
