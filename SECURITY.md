# Security Policy

## Status

This project is under active development. Do not expose it to untrusted networks until the setup guide explicitly says the build you are using is safe for that. Keep it on localhost or an isolated lab network by default.

## Supported versions

Security fixes are applied to the latest `main` branch and the latest published release. Older releases may not receive fixes.

## Reporting a vulnerability

Please report security issues privately:

1. Use GitHub's private vulnerability reporting on this repository if available.
2. Otherwise, contact the maintainers through the repository's listed contact method.
3. Do not include live secrets, credentials, or personal data in the report.
4. Give a clear description, impact, affected version/commit, and reproduction steps.

Please allow time for a fix before public disclosure.

## What is in scope

- Authentication and session handling
- Input validation and file path handling
- Rule-file writes and firewall command execution
- Cross-site request forgery and cross-site scripting
- Dependency vulnerabilities affecting the shipped application

## What is out of scope

- Attacks against machines you do not own or are not authorized to test
- Claims that detection rules catch every attack
- Deployment mistakes where users expose the service publicly against the documented guidance
- Third-party services not included in this repository

## Safe use

- Run only on systems you own or are authorized to test.
- Use an isolated virtual network for attack simulations.
- Keep the service bound to localhost unless you have configured TLS and a hardened reverse proxy. Authentication is built in but must be set up with `python backend/manage.py create-admin`.
- Set `FIREWALL_SECRET_KEY` for any persistent install and enable `FIREWALL_COOKIE_SECURE` only behind HTTPS.
- Review every block rule and audit entry.
