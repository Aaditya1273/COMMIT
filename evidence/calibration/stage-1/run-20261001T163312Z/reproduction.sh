#!/bin/sh
# Re-run this verification against the same revision.
set -e
git checkout 04563ed924bcfd10564ca84232b96a8fd7241780
node commit/verify.ts --plan calibration/verification/plan.json --out "${1:-evidence/rerun}"
