# Contributing to Google Calendar Booking System

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8.15.0 or higher (recommended) or npm

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/booking-mechanism.git
   cd booking-mechanism
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build all packages**
   ```bash
   pnpm build
   ```

4. **Run type checking**
   ```bash
   pnpm typecheck
   ```

### Project Structure

```
booking-mechanism/
├── packages/
│   ├── core/          # Types and utilities (zero dependencies)
│   ├── server/        # Google Calendar service + platform adapters
│   └── react/         # React components (coming soon)
├── examples/          # Example implementations
├── .github/           # GitHub templates and workflows
└── docs/              # Additional documentation
```

## Development Workflow

### 1. Create a Branch

Create a new branch for your feature or bugfix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clean, readable code
- Follow the existing code style
- Add/update tests if applicable
- Update documentation as needed

### 3. Build and Test

```bash
# Build all packages
pnpm build

# Type check
pnpm typecheck

# Clean build (if needed)
pnpm clean && pnpm build
```

### 4. Commit Changes

We use conventional commits for clear history:

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in rate limiting"
git commit -m "docs: update README with examples"
git commit -m "refactor: improve error handling"
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then open a Pull Request on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Reference to any related issues

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide type definitions for all public APIs
- Avoid `any` - use `unknown` when type is truly unknown

### Naming Conventions

- **Files**: kebab-case (`google-calendar-service.ts`)
- **Classes**: PascalCase (`GoogleCalendarService`)
- **Functions**: camelCase (`createHandler`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CONFIG`)
- **Types/Interfaces**: PascalCase (`GoogleCalendarConfig`)

### Code Quality

- **Functions**: Keep functions small and focused (< 50 lines)
- **Comments**: Use TSDoc for public APIs
- **Error Handling**: Always handle errors gracefully
- **Security**: Never log sensitive data (tokens, passwords, PII)

### Example

```typescript
/**
 * Creates a new calendar event
 * @param event - Event details
 * @returns Event ID
 * @throws {Error} If calendar is not configured
 */
async createEvent(event: CalendarEvent): Promise<string> {
  if (!this.isConfigured()) {
    throw new Error('Google Calendar API not configured');
  }

  // Implementation...
}
```

## Testing Guidelines

### When Tests Are Added

- Write tests for all new features
- Update tests for modified features
- Ensure all tests pass before submitting PR
- Aim for >80% code coverage

## Security Guidelines

### Critical Rules

1. **Never commit secrets**
   - No API keys, tokens, passwords in code
   - Use environment variables
   - Keep `.env` in `.gitignore`

2. **Validate all inputs**
   - Sanitize user-provided data
   - Validate formats (email, dates, etc.)
   - Set length limits

3. **Handle errors safely**
   - Don't expose internal details to clients
   - Log errors server-side only
   - Use development vs production error messages

4. **Review security implications**
   - Consider OWASP Top 10
   - Check for XSS, injection, CSRF risks
   - Review rate limiting and CORS

## Documentation Guidelines

### Code Documentation

- Use TSDoc comments for all public APIs
- Explain the "why" not just the "what"
- Include usage examples

### README Updates

- Update README.md for new features
- Add code examples
- Update API reference
- Keep feature list current

### Security Documentation

- Document security implications
- Update SECURITY.md for new features
- Add security best practices

## Pull Request Process

### Before Submitting

- [ ] Code builds successfully (`pnpm build`)
- [ ] Types check successfully (`pnpm typecheck`)
- [ ] Tests pass (when available)
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main
- [ ] Security review completed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] Code builds
- [ ] Types checked
- [ ] Documentation updated
- [ ] Security reviewed
```

### Review Process

1. Maintainer reviews PR
2. Address feedback if requested
3. PR approved and merged
4. Changes released in next version

## Adding New Features

### Platform Adapters

To add a new platform adapter:

1. Create file in `packages/server/src/adapters/your-platform.ts`
2. Implement adapter following existing patterns
3. Export from `packages/server/tsup.config.ts`
4. Add documentation to README
5. Create example in `examples/`

### New Packages

To add a new package:

1. Create directory in `packages/your-package/`
2. Add `package.json` with proper metadata
3. Add to `pnpm-workspace.yaml`
4. Follow monorepo structure
5. Update root README

## Releasing (Maintainers Only)

We use changesets for version management:

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish
pnpm publish-packages
```

## Questions?

- Open an issue for questions
- Tag maintainers for urgent matters
- Check existing issues and PRs first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to making this library better! 🎉
