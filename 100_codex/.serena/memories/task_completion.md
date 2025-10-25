Before requesting review or finishing a task:
- Ensure virtualenv deps are installed and run `pytest` to confirm unit/integration coverage.
- Execute the CLI smoke test `python -m irbank_scraper.cli --stock-code 6758 --output data/irbank_6758.csv` when behavior changes.
- Update relevant OpenSpec specs or change files and run `openspec validate <change-id> --strict`.
- Follow git guidelines: focused commits with <60 char imperative subject, reference relevant specs (e.g., `Refs: openspec/irbank-scraper/spec.md#L1`), and capture test evidence.