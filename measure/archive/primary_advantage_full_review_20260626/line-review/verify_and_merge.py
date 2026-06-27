#!/usr/bin/env python3
"""Merge coverage patches, verify coverage mechanics, extract findings from evidence files."""

import csv
import json
import os
import re
import sys
from collections import defaultdict, Counter
from pathlib import Path

TRACK_DIR = Path("/home/daniel-bo/Desktop/reading-advantage-monorepo/measure/tracks/primary_advantage_full_review_20260626")
LR_DIR = TRACK_DIR / "line-review"
PATCHES_DIR = LR_DIR / "coverage-patches"
EVIDENCE_DIR = LR_DIR / "evidence"
INVENTORY_TSV = LR_DIR / "file-inventory.tsv"
COVERAGE_TSV = LR_DIR / "line-review-coverage.tsv"
BATCH_MANIFEST = LR_DIR / "batch-manifest.json"

def parse_tsv(filepath):
    rows = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            rows.append(row)
    return rows

def write_tsv(filepath, header, rows):
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=header, delimiter='\t', lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)

def main():
    errors = []
    warnings = []

    # Step 1: Read inventory
    print("=== Step 1: Reading file-inventory.tsv ===")
    inv_rows = parse_tsv(INVENTORY_TSV)
    inv_files = {}
    for r in inv_rows:
        inv_files[r['file']] = int(r['line_count'])
    print(f"  Inventory files: {len(inv_files)}, total lines: {sum(inv_files.values())}")

    # Step 2: Read current coverage
    print("\n=== Step 2: Reading current line-review-coverage.tsv ===")
    cov_rows = parse_tsv(COVERAGE_TSV)
    cov_map = {}
    for r in cov_rows:
        cov_map[r['file']] = r
    print(f"  Coverage rows: {len(cov_map)}")

    # Step 3: Read all coverage patches
    print("\n=== Step 3: Reading coverage patches ===")
    patches = sorted(Path(PATCHES_DIR).glob("*.tsv"))
    print(f"  Found {len(patches)} patch files")
    
    patch_files_seen = set()
    merged_count = 0
    conflict_count = 0
    for patch_path in patches:
        patch_rows = parse_tsv(patch_path)
        for pr in patch_rows:
            f = pr['file']
            if f in patch_files_seen:
                errors.append(f"CONFLICT: file '{f}' appears in multiple patches")
                conflict_count += 1
            patch_files_seen.add(f)
            if f in cov_map and cov_map[f].get('status') == 'reviewed':
                # Check for conflict with existing reviewed row
                existing = cov_map[f]
                if (existing.get('reviewed_ranges') != pr.get('reviewed_ranges') or
                    existing.get('finding_count') != pr.get('finding_count') or
                    existing.get('evidence_file') != pr.get('evidence_file')):
                    errors.append(f"CONFLICT: file '{f}' already reviewed with different data")
                    conflict_count += 1
            cov_map[f] = pr
            merged_count += 1
    print(f"  Merged {merged_count} rows, {conflict_count} conflicts")

    # Step 4: Verify file set match
    print("\n=== Step 4: File set matching ===")
    inv_set = set(inv_files.keys())
    cov_set = set(cov_map.keys())
    only_inv = inv_set - cov_set
    only_cov = cov_set - inv_set
    if only_inv:
        errors.append(f"MISSING: {len(only_inv)} files in inventory but not in coverage: {list(only_inv)[:5]}")
    if only_cov:
        errors.append(f"EXTRA: {len(only_cov)} files in coverage but not in inventory: {list(only_cov)[:5]}")
    print(f"  Inventory files: {len(inv_set)}, Coverage files: {len(cov_set)}")
    print(f"  Only in inventory: {len(only_inv)}, Only in coverage: {len(only_cov)}")

    # Step 5: Verify every row
    print("\n=== Step 5: Row-level verification ===")
    not_reviewed = 0
    evidence_missing = 0
    range_mismatch = 0
    finding_not_numeric = 0
    reviewed_count = 0
    
    for f, r in sorted(cov_map.items()):
        status = r.get('status', '').strip()
        if status != 'reviewed':
            not_reviewed += 1
            if not_reviewed <= 5:
                errors.append(f"NOT_REVIEWED: '{f}' status={status}")
            continue
        
        reviewed_count += 1
        
        # Check evidence file exists
        ev_path = r.get('evidence_file', '').strip()
        if not ev_path:
            evidence_missing += 1
            errors.append(f"NO_EVIDENCE: '{f}' has empty evidence_file")
        else:
            full_ev = Path("/home/daniel-bo/Desktop/reading-advantage-monorepo") / ev_path
            if not full_ev.exists():
                evidence_missing += 1
                errors.append(f"EVIDENCE_MISSING: '{f}' -> {ev_path}")
        
        # Check reviewed_ranges = 1-N
        exp_lines = inv_files.get(f)
        if exp_lines is None:
            range_mismatch += 1
            errors.append(f"NO_INVENTORY: '{f}' not found in inventory")
        else:
            ranges = r.get('reviewed_ranges', '').strip()
            if ranges != f"1-{exp_lines}":
                range_mismatch += 1
                errors.append(f"RANGE_MISMATCH: '{f}' expected 1-{exp_lines}, got '{ranges}'")
        
        # Check finding_count numeric
        fc = r.get('finding_count', '').strip()
        try:
            int(fc)
        except (ValueError, TypeError):
            finding_not_numeric += 1
            errors.append(f"FINDING_NOT_NUMERIC: '{f}' finding_count='{fc}'")

    print(f"  Reviewed: {reviewed_count}, Not reviewed: {not_reviewed}")
    print(f"  Evidence missing: {evidence_missing}, Range mismatch: {range_mismatch}, Non-numeric findings: {finding_not_numeric}")

    # Step 6: Verify batch-manifest coverage
    print("\n=== Step 6: Batch-manifest verification ===")
    with open(BATCH_MANIFEST, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    
    batch_files = {}
    for batch in manifest['batches']:
        bid = batch['id']
        for bf in batch['files']:
            batch_files[bf['file']] = bid
    
    manifest_set = set(batch_files.keys())
    only_manifest = manifest_set - cov_set
    only_cov2 = cov_set - manifest_set
    if only_manifest:
        errors.append(f"MANIFEST_ONLY: {len(only_manifest)} files in manifest but not in coverage")
    if only_cov2:
        errors.append(f"COVERAGE_ONLY: {len(only_cov2)} files in coverage but not in manifest")
    
    print(f"  Manifest files: {len(manifest_set)}, Coverage files: {len(cov_set)}")
    print(f"  Only in manifest: {len(only_manifest)}, Only in coverage: {len(only_cov2)}")

    # Step 7: Extract findings from all evidence files
    print("\n=== Step 7: Extracting findings from evidence files ===")
    ev_files = sorted(Path(EVIDENCE_DIR).glob("*.md"))
    print(f"  Evidence files found: {len(ev_files)}")
    
    all_findings = []
    finding_pattern = re.compile(r'^###\s+(LR-[^\s]+)\s*[-–—]\s*(.+)$')
    severity_pattern = re.compile(r'^\s*-\s*Severity:\s*(Critical|High|Medium|Low)')
    category_pattern = re.compile(r'^\s*-\s*Fork-divergence category:\s*(.+)$')
    file_pattern = re.compile(r'^\s*-\s*File:\s*`.+`')
    evidence_line_pattern = re.compile(r'^\s*-\s*Evidence:\s*(.+)$')
    
    for ev_path in ev_files:
        batch_id = ev_path.stem
        with open(ev_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split into finding blocks
        finding_blocks = re.split(r'\n(?=### LR-)', content)
        for block in finding_blocks:
            m = finding_pattern.search(block)
            if not m:
                continue
            finding_id = m.group(1)
            title = m.group(2).strip()
            
            sev_m = severity_pattern.search(block)
            sev = sev_m.group(1) if sev_m else "Unspecified"
            
            cat_m = category_pattern.search(block)
            cat = cat_m.group(1).strip() if cat_m else "Unspecified"
            
            ev_m = evidence_line_pattern.search(block)
            evidence = ev_m.group(1).strip() if ev_m else ""
            
            all_findings.append({
                'id': finding_id,
                'title': title,
                'severity': sev,
                'category': cat,
                'batch_id': batch_id,
                'evidence': evidence,
                'evidence_file': f"line-review/evidence/{batch_id}.md",
            })

    print(f"  Total findings extracted: {len(all_findings)}")

    # Step 8: Write merged coverage
    print("\n=== Step 8: Writing merged coverage TSV ===")
    header = ['package_app', 'file', 'line_count', 'reviewer', 'status', 'evidence_file', 'reviewed_ranges', 'finding_count']
    out_rows = []
    for f in sorted(cov_map.keys()):
        r = cov_map[f]
        # Ensure line_count matches inventory
        r['line_count'] = str(inv_files.get(f, r.get('line_count', '0')))
        out_rows.append(r)
    
    write_tsv(COVERAGE_TSV, header, out_rows)
    print(f"  Written {len(out_rows)} rows to {COVERAGE_TSV}")

    # Step 9: Summary stats
    print("\n=== Step 9: Summary statistics ===")
    sev_counts = Counter(f['severity'] for f in all_findings)
    cat_counts = Counter(f['category'] for f in all_findings)
    print(f"  Severity distribution: {dict(sev_counts)}")
    print(f"  Fork-divergence distribution: {dict(cat_counts)}")
    print(f"  Total batches: {len(manifest['batches'])}")
    print(f"  Evidence files: {len(ev_files)}")
    print(f"  Total files: {len(inv_files)}")
    print(f"  Total lines: {sum(inv_files.values())}")
    print(f"  Total reviewed rows: {reviewed_count}")
    print(f"  Total not reviewed: {not_reviewed}")

    # Write findings data as JSON for synthesis
    findings_json = LR_DIR / "lrf-extracted.json"
    with open(findings_json, 'w', encoding='utf-8') as f:
        json.dump(all_findings, f, indent=2)
    print(f"\n  Findings written to {findings_json}")

    # Write stats JSON
    stats = {
        "inventory_files": len(inv_files),
        "inventory_lines": sum(inv_files.values()),
        "coverage_rows": len(cov_map),
        "reviewed_rows": reviewed_count,
        "not_reviewed_rows": not_reviewed,
        "batch_count": len(manifest['batches']),
        "evidence_files_present": len(ev_files),
        "total_findings": len(all_findings),
        "severity_distribution": dict(sev_counts),
        "fork_divergence_distribution": dict(cat_counts),
        "errors": errors,
        "warnings": warnings,
    }
    stats_json = LR_DIR / "verification-stats.json"
    with open(stats_json, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)
    print(f"  Stats written to {stats_json}")

    # Final report
    print("\n=== FINAL VERIFICATION ===")
    if errors:
        print(f"  FAIL: {len(errors)} errors found:")
        for e in errors:
            print(f"    - {e}")
    else:
        print("  PASS: All verification checks passed.")
    
    if warnings:
        print(f"  WARNINGS: {len(warnings)}")
        for w in warnings:
            print(f"    - {w}")
    
    return len(errors) == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
