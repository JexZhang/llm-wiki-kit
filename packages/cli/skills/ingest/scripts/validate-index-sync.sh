#!/usr/bin/env bash
# validate-index-sync.sh — 校验 index.md 与实际 wiki 文件一致
# 用法：bash validate-index-sync.sh <wiki-root>
set -eo pipefail

WIKI_ROOT="${1:-.}"
INDEX="$WIKI_ROOT/index.md"

[[ -f "$INDEX" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$INDEX\",\"rule\":\"missing-index\",\"message\":\"index.md 不存在\"}]}"
  exit 1
}

# 实际页面集合
declare -A ACTUAL=()
while IFS= read -r -d '' f; do
  ACTUAL[$(basename "$f" .md)]=1
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

# index.md 列出的页面集合
declare -A LISTED=()
while IFS= read -r name; do
  name="${name%%|*}"; name="${name## }"; name="${name%% }"
  [[ -n "$name" ]] && LISTED[$name]=1
done < <(grep -oE '\[\[[^]]+\]\]' "$INDEX" | sed -E 's/^\[\[|\]\]$//g')

ERRORS="[]"
push() {
  ERRORS=$(jq -c --arg f "$1" --arg r "$2" --arg m "$3" '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

for p in "${!ACTUAL[@]}"; do
  [[ -z "${LISTED[$p]:-}" ]] && push "$INDEX" "index-missing-page" "index.md 未列出：[[$p]]"
done
for p in "${!LISTED[@]}"; do
  [[ -z "${ACTUAL[$p]:-}" ]] && push "$INDEX" "index-orphan-entry" "index.md 列了不存在的页：[[$p]]"
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
