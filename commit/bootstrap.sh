#!/bin/sh
# Install the COMMIT factory into a fresh result repository: the seat mandates, the
# verification toolkit and FACTORY.md. Nothing track-specific and no service code is
# copied -- the band writes every stage folder itself, in the room.
#
#   commit/bootstrap.sh /absolute/path/to/result-repo
set -eu
dest="${1:?usage: commit/bootstrap.sh /absolute/path/to/result-repo}"
here="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$dest/plan" "$dest/verification" "$dest/evidence"
cp -R "$here/mandates" "$dest/"
mkdir -p "$dest/commit/lib"
cp "$here/commit/"*.ts "$here/commit/bootstrap.sh" "$dest/commit/"
cp "$here/commit/lib/"*.ts "$dest/commit/lib/"
cp "$here/FACTORY.md" "$dest/FACTORY.md"
[ -f "$dest/.gitignore" ] || printf 'node_modules/\n.venv/\n__pycache__/\n*.log\n.env\n' > "$dest/.gitignore"

if [ ! -d "$dest/.git" ]; then
  git -C "$dest" init -q -b main
fi
echo "COMMIT factory installed in $dest:"
echo "  mandates/   seat instructions (planner, builder, verifier) -- edit Harness/Model to match your seats"
echo "  commit/     verifier toolkit: verify.ts, mutate.ts, campaign.ts (Node 22.18+, no dependencies)"
echo "  FACTORY.md  how the factory works; README.md is yours to write"
echo "Next: create the three seats in Band Desktop and dispatch the task (FACTORY.md, 'Running a stage')."
