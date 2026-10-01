#!/bin/sh
# The verifier's full check against one running candidate, used as the mutation
# campaign's kill check. Every layer always runs, so the report can say which layer
# caught each defect -- including what the shipped checks alone would have missed.
#
#   calibration/verification/kill-suite.sh <base-url>
#
# Prints one `COMMIT-LAYER <name>=<pass|fail>` line per layer; exits non-zero if any
# layer failed. COMMIT_KICKOFF points at the official kickoff checkout (default:
# ../dark-factory-wearedevs next to this repository).
url="$1"
here="$(cd "$(dirname "$0")/../.." && pwd)"
kickoff="${COMMIT_KICKOFF:-$here/../dark-factory-wearedevs}"
status=0

layer() {
  name="$1"; shift
  if "$@" > /dev/null 2>&1; then
    echo "COMMIT-LAYER $name=pass"
  else
    echo "COMMIT-LAYER $name=fail"
    status=1
  fi
}

layer contract node --no-warnings "$here/calibration/verification/contract.ts" --base-url "$url"
layer reference node --no-warnings "$here/commit/campaign.ts" --module "$here/calibration/verification/reference.campaign.ts" \
  --base-url "$url" --seed 481927 --operations 400
layer adversarial node --no-warnings "$here/calibration/verification/adversarial.ts" --base-url "$url" --rounds 1 --workers 30
layer shipped sh -c "cd '$kickoff' && .venv/bin/python -m pytest pocketful/test/stage_1 -p harness.plugin --base-url '$url' -q -x -p no:cacheprovider"
exit $status
