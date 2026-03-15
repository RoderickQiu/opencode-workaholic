# opencode-workaholic

Enforces minimum task duration. Prevents AI from ending tasks prematurely before a time limit expires. Useful for forcing continuous work and preventing premature convergence.

(c) 2026 [Roderick Qiu](https://r-q.name).

## Why?

Sometimes AI finishes tasks too quickly, declaring "done" before thoroughly exploring all options or completing all necessary work. This plugin enforces a minimum work duration by:

- Blocking the AI from ending until the timer expires
- Injecting system prompts that reinforce the workaholic mindset
- Encouraging the AI to propose new tasks when todos are complete

## Features

- ⏱️ **Minimum duration enforcement** - AI cannot end until timer expires
- 🚫 **Sleep blocking** - Prevents time-wasting via sleep commands
- 🔄 **Persistent timer** - Survives across messages
- 📊 **Status checking** - Always knows remaining time
- 💪 **Strong behavioral prompts** - Reinforces workaholic mindset
- 🔐 **Checkout system** - AI must call checkout to officially end (only works at timer = 0)
- 🎲 **Random prompt rotation** - 6 different prompt styles prevent AI from adapting

## Usage

### Start Workaholic Mode

```bash
/workaholic [Your requirements, for xxx minutes]
```

Or use the tool directly:

```
Use workaholic.start with minutes=30
```

### Check Status

```
Call workaholic.status to see remaining time
```

### End Task (Checkout)

```
Call workaholic.checkout to officially end the task
- Only works when timer = 0
- If time remains, checkout will be rejected
```

## How It Works

1. **Timer starts** when you invoke `/workaholic` in OpenCode
2. **Every response** - AI automatically checks remaining time via system prompt injection
3. **Sleep forbidden** - Any attempt to use `sleep` throws an error
4. **End detection** - If AI says "done", a warning is appended forcing continuation
5. **Checkout required** - AI must call `workaholic.checkout` to officially end
6. **Only ends when** - Timer shows 0 remaining seconds AND checkout is called

### Custom Tools


| Tool                | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `workaholic.start`  | Start timer with duration in minutes (supports decimals: 2.5, 3.5) |
| `workaholic.status` | Check remaining time                                               |
| `workaholic.checkout` | End task - only succeeds when timer = 0                        |
| `workaholic.stop`   | Stop workaholic mode early                                         |


## Installation

### Prerequisites

- OpenCode with plugin support

### Install Plugin

#### Use Bunx

```bash
bunx opencode-workaholic@latest install
```

#### Manual Installation

```bash
# Clone or copy the plugin to your plugins directory
# Then add to your OpenCode config
```

Edit `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-workaholic"]
}
```

Or use local path:

```json
{
  "plugins": ["file:///<path-to>/opencode-workaholic"]
}
```

### Build

```bash
cd opencode-workaholic
bun install
mise run build
```

## Development

- `mise run build` - Build the plugin
- `mise run test` - Run tests
- `mise run lint` - Lint code
- `mise run lint:fix` - Fix linting issues
- `mise run format` - Format code with Prettier

## License

MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenCode](https://opencode.ai) - The platform that makes this possible
- [opencode-plugin-template](https://github.com/zenobi-us/opencode-plugin-template) - The plugin framework that makes this easier

