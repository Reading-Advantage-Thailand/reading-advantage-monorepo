#!/usr/bin/env python3
"""Extract all LR findings from evidence files."""

import json
import re
from collections import Counter
from pathlib import Path

EVIDENCE_DIR = Path("/home/daniel-bo/Desktop/reading-advantage-monorepo/measure/tracks/primary_advantage_full_review_20260626/line-review/evidence")

def extract_findings(ev_path):
    batch_id = ev_path.stem
    with open(ev_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    findings = []
    
    # Split by finding boundaries
    blocks = re.split(r'\n(?=### LR-)', content)
    
    for block in blocks:
        # First line should be the finding header
        lines = block.strip().split('\n')
        if not lines:
            continue
        
        first_line = lines[0].strip()
        # Match: ### LR-XXX-YYY-NNN — Title
        m = re.match(r'^###\s+(LR-[^\s]+)\s*[–—]\s*(.+)$', first_line)
        if not m:
            # Try matching just the ID
            m = re.match(r'^###\s+(LR-[^\s]+)', first_line)
            if not m:
                continue
            finding_id = m.group(1)
            title = ""
        else:
            finding_id = m.group(1)
            title = m.group(2).strip()
        
        # Extract severity
        sev_m = re.search(r'^\s*-\s*Severity:\s*(Critical|High|Medium|Low)', block, re.MULTILINE)
        sev = sev_m.group(1) if sev_m else "Unspecified"
        
        # Extract fork-divergence category
        cat_m = re.search(r'^\s*-\s*Fork-divergence category:\s*(.+?)$', block, re.MULTILINE)
        cat = cat_m.group(1).strip() if cat_m else "Unspecified"
        
        # Extract file reference
        file_m = re.search(r'^\s*-\s*File:\s*`([^`]+)`', block, re.MULTILINE)
        file_ref = file_m.group(1) if file_m else ""
        
        # Extract evidence
        ev_m = re.search(r'^\s*-\s*Evidence:\s*(.+)$', block, re.MULTILINE)
        evidence = ev_m.group(1).strip() if ev_m else ""
        
        # Extract impact
        imp_m = re.search(r'^\s*-\s*Impact:\s*(.+)$', block, re.MULTILINE)
        impact = imp_m.group(1).strip() if imp_m else ""
        
        # Extract recommendation
        rec_m = re.search(r'^\s*-\s*Recommendation:\s*(.+)$', block, re.MULTILINE)
        recommendation = rec_m.group(1).strip() if rec_m else ""
        
        findings.append({
            'id': finding_id,
            'title': title,
            'severity': sev,
            'category': cat,
            'file': file_ref,
            'evidence': evidence,
            'impact': impact,
            'recommendation': recommendation,
            'batch_id': batch_id,
            'evidence_file': f"line-review/evidence/{batch_id}.md",
        })
    
    return findings

def main():
    ev_files = sorted(EVIDENCE_DIR.glob("*.md"))
    all_findings = []
    
    for ev_path in ev_files:
        findings = extract_findings(ev_path)
        all_findings.extend(findings)
        if findings:
            print(f"{ev_path.name}: {len(findings)} findings")
    
    print(f"\nTotal findings: {len(all_findings)}")
    
    # Stats
    sev_counts = Counter(f['severity'] for f in all_findings)
    cat_counts = Counter(f['category'] for f in all_findings)
    print(f"Severity distribution: {dict(sev_counts)}")
    print(f"Fork-divergence distribution: {dict(cat_counts)}")
    
    # Deduplication check
    ids = [f['id'] for f in all_findings]
    id_counts = Counter(ids)
    dupes = {k: v for k, v in id_counts.items() if v > 1}
    if dupes:
        print(f"WARNING: Duplicate finding IDs: {dupes}")
    
    # Write JSON
    out_path = EVIDENCE_DIR.parent / "lrf-extracted.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(all_findings, f, indent=2)
    print(f"Written to {out_path}")
    
    # Count by batch
    batch_counts = Counter(f['batch_id'] for f in all_findings)
    batches_with_findings = sum(1 for v in batch_counts.values() if v > 0)
    batches_no_findings = 103 - batches_with_findings  # 103 total batches
    print(f"Batches with findings: {batches_with_findings}, without: {batches_no_findings}")

if __name__ == '__main__':
    main()
