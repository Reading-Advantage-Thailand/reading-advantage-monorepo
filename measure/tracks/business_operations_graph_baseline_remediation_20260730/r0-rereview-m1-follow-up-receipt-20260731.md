# R0-REREVIEW-M1 Follow-up Receipt

- Track: `business_operations_graph_baseline_remediation_20260730`
- Finding: `R0-REREVIEW-M1` (Medium)
- Result: **CLOSED**
- Scope: fixture generator, fixture-index pin, focused tests, and this receipt only
- Parent and successor gates: unchanged and blocked

## Implemented contract

`fixtures/v1/generate-fixtures.py --check` now regenerates into a temporary
directory, copies only the immutable parent fixtures needed for generation, and
compares every fixture file byte-for-byte, including `fixture-index-v1.json`.
It never passes the real fixture directory to a writer. A matching generated
copy exits `0`; missing, extra, or changed fixture bytes exit `1` and list the
drift. The generator hash/size in the index was refreshed because the index
pins the generator itself; no candidate fixture payload was regenerated.

## Verification

| Command | Result |
| --- | --- |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_fixture_generator -v` | `3` tests, `OK` |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_remediation -v` | `29` tests, `OK` |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest measure.tests.test_business_operations_graph_baseline_snapshot -v` | `37` tests, `OK` |

The focused generator tests capture fixture digest/size/mtime snapshots and
Git status, unstaged/staged diffs, real-index bytes, and real-index mtime. They
prove those values remain unchanged for both a successful check and a changed
fixture. The real CLI check also exits `1` without writes because the preserved
dirty APK source differs from the committed R0 fixture baseline.

Trust-root values after the implementation are:

- Generator SHA-256: `a6d53355f28e72dbddd86d336b830596fe799bf34a0b3fcd388d3c3af40ed071`
- Fixture-index SHA-256: `887f5975b5f876b08751cd3884bb39ac70678320abc9e187875ed84a10e2ea4f`
