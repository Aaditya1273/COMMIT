#!/bin/sh
# Re-run this verification (run 20261002T040633Z-5dd507) against the same revision.
set -eu
git checkout 72aa9ed4fbcf80c6d73cffc3d8662be41a70d4cd
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
