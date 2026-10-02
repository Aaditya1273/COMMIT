#!/bin/sh
# Re-run this verification (run 20261002T033320Z-a83381) against the same revision.
set -eu
git checkout bcc73e94b86879d84e2f888f09c8ec6a05a37a61
node commit/verify.ts --plan 'calibration/verification/plan.json' --out "${1:-evidence/rerun-$(date -u +%Y%m%dT%H%M%SZ)}"
