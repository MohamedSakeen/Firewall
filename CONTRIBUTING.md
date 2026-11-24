# Contributing

Thanks for helping improve this project.

## Ground rules

- Keep the project honest about what it can and cannot do.
- Do not add fake metrics, sample data presented as live data, or security claims that are not tested.
- Never commit secrets, passwords, tokens, `.env`, or private keys.
- Keep changes focused. One change should have one purpose.

## Local setup

```bash
python start_all.py
python -m pytest
cd frontend && npm run build && npm run lint
```

The launcher creates `backend/.venv` and installs pinned backend requirements there. Do not install project dependencies globally.

## Before opening a pull request

1. Create a branch from `main`.
2. Keep commits focused; use short messages like `fix(auth): enforce role checks` or `docs: clarify setup`.
3. Run the tests and frontend build.
4. Add or update tests when behavior changes.
5. Update docs when behavior, setup, or limits change.
6. Do not weaken auth, CSRF, TLS, input validation, tests, or linters to make a change pass.

## Reporting bugs

Use the bug template and include:

- What you expected
- What happened
- Your OS and browser
- Exact steps to reproduce
- Relevant logs with secrets removed

## Security issues

Do not open a public issue for a vulnerability. Follow `SECURITY.md`.

## Code style

- Python: follow the existing style, use parameterized SQL, and validate input.
- React: follow existing components and patterns; avoid `dangerouslySetInnerHTML` and inline event-handler strings.
- Use environment variables for configuration.

By contributing, you agree that your contribution is licensed under the MIT License.
