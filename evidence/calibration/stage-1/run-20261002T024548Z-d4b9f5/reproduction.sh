#!/bin/sh
# Re-run this verification (run 20261002T024548Z-d4b9f5) against the same revision.
set -eu
git checkout e4b5f935ea946e0c3005886ee95b19b49672c678
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
