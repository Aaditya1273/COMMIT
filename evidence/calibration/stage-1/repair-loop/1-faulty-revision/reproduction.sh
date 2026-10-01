#!/bin/sh
# Re-run this verification against the same revision.
set -e
git checkout 6020598c7be11c2fa445c124826539190a5cdb06
node commit/verify.ts --plan calibration/verification/plan.json --out "${1:-evidence/rerun}"
