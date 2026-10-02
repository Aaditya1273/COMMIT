#!/bin/sh
# Re-run this verification (run 20261002T081100Z-0f8bcc) against the same revision.
set -eu
git checkout f9837321d140e35eef340bde368db31bb16583c0
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
