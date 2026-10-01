#!/bin/sh
# Re-run this verification against the same revision.
set -e
git checkout 57e088bbcfc010867dbabca1fb615707d6bb8987
node commit/verify.ts --plan calibration/verification/plan.json --out "${1:-evidence/rerun}"
