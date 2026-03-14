# Changelog

## 0.2.1 (2025-03-15)

### Features

- **CLI installer**: Added `bunx opencode-workaholic@latest install` support
- **Easy installation**: Users can now install with one command

### Improvements

- Added `bin` field to package.json for CLI entry point

---

## 0.2.0 (2025-03-15)

### Features

- **Idle detection**: Detects when AI is checking status too frequently (3+ times in 12 seconds)
- **Stronger behavioral prompts**: Added "NO EARLY ENDING" rules to prevent premature wrap-up
- **Status check warnings**: Returns harsh warnings when AI is idling or checking status too often

### Improvements

- Removed prompts that encouraged frequent status checking
- Added explicit rules against "essentially complete", "wrap up", "finish" thinking
- Timer only ends at EXACTLY 0, not "close enough"

---

## 0.1.0 (2025-03-14)

### Features

- **Custom tools**: Added `workaholic.start`, `workaholic.status`, and `workaholic.stop` tools
- **Duration support**: Supports decimal minutes (2.5, 3.5, etc.) via Zod schema
- **System prompt injection**: Automatically injects workaholic rules when timer is active
- **Sleep blocking**: Prevents time-wasting by blocking sleep commands
- **Persistent timer**: Timer state stored in `/tmp/workaholic_timer_*.json`
- **Multi-process isolation**: Timer files include process PID to avoid conflicts between multiple OpenCode instances
- **Command template**: `/workaholic` command with strong behavioral prompts

### Plugin Architecture

- Built on OpenCode plugin template
- Uses file-based timer state for persistence
- Implements experimental chat hooks for system prompt injection
- Tool execute hooks for sleep command blocking

---

All notable changes to this project will be documented here by Release Please.
