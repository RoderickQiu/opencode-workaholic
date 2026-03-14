# Changelog

## 1.0.0 (2026-03-14)


### Features

* create opencode-workaholic plugin ([c2f2116](https://github.com/RoderickQiu/opencode-workaholic/commit/c2f211634f94b3a123f3c7a4dad46fb69d78735a))

## 0.1.0 (2025-03-14)

### Features

- **Custom tools**: Added `workaholic.start`, `workaholic.status`, and `workaholic.stop` tools
- **Duration support**: Supports decimal minutes (2.5, 3.5, etc.) via Zod schema
- **System prompt injection**: Automatically injects workaholic rules when timer is active
- **Sleep blocking**: Prevents time-wasting by blocking sleep commands
- **Persistent timer**: Timer state stored in `/tmp/workaholic_timer_*.json`
- **Command template**: `/workaholic` command with strong behavioral prompts

### Plugin Architecture

- Built on OpenCode plugin template
- Uses file-based timer state for persistence
- Implements experimental chat hooks for system prompt injection
- Tool execute hooks for sleep command blocking

---

All notable changes to this project will be documented here by Release Please.
