#!/usr/bin/env bash
# check-orphans.sh — 找出无入站链接的 wiki 页面
# 用法：bash check-orphans.sh <wiki-root>
# 说明：index.md / log.md / MOC.md 中的链接不算入站源，因为它们是自动化索引。
set -eo pipefail

WIKI_ROOT="${1:-.}"
[[ -d "$WIKI_ROOT/wiki" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/\"}]}"
  exit 1
}

declare -A ALL_PAGES=()
while IFS= read -r -d '' f; do
  ALL_PAGES[$(basename "$f" .md)]="$f"
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

# 收集所有入站链接目标（排除 index/log/MOC）
declare -A INBOUND=()
while IFS= read -r -d '' f; do
  base=$(basename "$f")
  if [[ "$f" == "$WIKI_ROOT/index.md" || "$f" == "$WIKI_ROOT/log.md" || "$f" == "$WIKI_ROOT/MOC.md" ]]; then
    continue
  fi
  while IFS= read -r target; do
    name="${target%%|*}"; name="${name## }"; name="${name%% }"
    [[ -n "$name" ]] && INBOUND["$name"]=1
  done < <(grep -oE '\[\[[^]]+\]\]' "$f" | sed -E 's/^\[\[|\]\]$//g')
done < <(find "$WIKI_ROOT" -type f -name '*.md' -print0)

ERRORS="[]"
for p in "${!ALL_PAGES[@]}"; do
  if [[ -z "${INBOUND[$p]:-}" ]]; then
    ERRORS=$(jq -c --arg f "${ALL_PAGES[$p]}" --arg r "orphan" --arg m "孤立页面：无入站链接：$p" \
      '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
  fi
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
