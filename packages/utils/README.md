# Shared utilities

`logStructuredError` is the shared error logging adapter boundary.
It writes one JSON record with an error severity, event name, error name, and safe context fields.
It excludes error messages and stacks to prevent secret disclosure.
