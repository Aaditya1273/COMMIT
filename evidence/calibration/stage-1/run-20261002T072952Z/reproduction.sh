#!/bin/sh
# Re-run this verification (run 20261002T072952Z-db9f5a) against the same revision.
set -eu
git checkout a899d17e549a35e126c77e602036b92337e2dfc0
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
