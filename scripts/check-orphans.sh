#!/usr/bin/env bash
# Every component must have an importer. A screen can look finished while
# rendering nothing, so this is the primary check that a restoration actually
# landed rather than merely compiling.
set -uo pipefail
cd "$(dirname "$0")/.."

status=0
while IFS= read -r file; do
  # Match the import specifier ("@/components/ui/chip"), not the basename —
  # a bare name collides with unrelated words all over the tree.
  spec="${file#src/}"          # components/ui/chip.tsx
  spec="${spec%.tsx}"          # components/ui/chip
  if ! grep -rq "@/${spec}\"\|@/${spec}'" src --include='*.ts' --include='*.tsx'; then
    echo "ORPHAN  $file"
    status=1
  fi
done < <(find src/components -name '*.tsx' | sort)

[ "$status" -eq 0 ] && echo "All components have an importer."
exit "$status"
