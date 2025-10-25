<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Repository Guidelines

## Project Structure & Module Organization
- `openspec/` stores canonical specs and change logs; update it whenever behaviour shifts.
- Place scraper code under `irbank-scraper/src/` (create if missing) and mirror modules in `irbank-scraper/tests/`.
- Keep HTTP fixtures in `tests/fixtures/` and write generated CSVs to a gitignored `data/` folder.

## Build, Test, and Development Commands
- `python -m venv .venv && source .venv/bin/activate` — set up a Python 3.9+ virtualenv.
- `pip install -r requirements.txt` — install runtime and dev dependencies (`pandas`, `requests`, `beautifulsoup4`).
- `pytest` — run the unit and integration suite.
- `python -m irbank_scraper.cli --stock-code 6758 --output data/irbank_6758.csv` — execute the scraper against a sample code path.

## Coding Style & Naming Conventions
- Follow PEP 8, 4-space indent, and annotate public functions with type hints.
- Use snake_case for modules and functions, PascalCase for classes, and ALL_CAPS for constants.
- Group HTTP selectors in `selectors.py`, derived-metric math in `metrics.py`, and central logging via `logging.getLogger(__name__)`.

## Testing Guidelines
- Name tests `test_<behavior>.py`; keep parametrised cases for selector parsing, unit conversion, and formula edges.
- Mock IRBANK responses with recorded HTML under `tests/fixtures/html/`; never hit the live site in CI.
- Target ≥85% line coverage on calculation modules and assert on NaN/zero-division handling.

## Commit & Pull Request Guidelines
- Write imperative commit subjects under 60 characters (e.g., `Add debt table selectors`) and keep diffs focused.
- Reference related specs or issues (`Refs: openspec/irbank-scraper/spec.md#L1`) and record test evidence in every PR.
- Ensure lint, tests, and a sample scrape succeed locally before requesting review; attach CSV diffs only when behaviour shifts.

## Security & Configuration Tips
- Respect IRBANK rate limits by keeping exponential backoff defaults and avoiding parallel scraping without approval.
- Store credentials or custom endpoints in `.env` files loaded via `python-dotenv`; never commit sensitive data.
