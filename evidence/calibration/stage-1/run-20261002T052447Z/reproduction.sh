#!/bin/sh
# Re-run this verification (run 20261002T052447Z-482df0) against the same revision.
set -eu
git checkout 80f7caa10c36110b87ebe425d80f9bdb9c554cf7
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
