#!/usr/bin/env bash
# validate-links.sh — 校验 wiki link [[X]] 指向的页面存在
# 用法：bash validate-links.sh <wiki-root>
set -eo pipefail

WIKI_ROOT="${1:-.}"
[[ -d "$WIKI_ROOT/wiki" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/ 子目录\"}]}"
  exit 1
}

# 收集所有页面（basename 不含扩展名）
declare -A PAGES=()
while IFS= read -r -d '' f; do
  base=$(basename "$f" .md)
  PAGES["$base"]=1
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

ERRORS="[]"
push_error() {
  local file="$1" target="$2"
  ERRORS=$(jq -c --arg f "$file" --arg r "broken-link" --arg m "目标页面不存在：[[$target]]" \
    '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

while IFS= read -r -d '' f; do
  # 提取 [[X]] 或 [[X|Y]] 的 X
  while IFS= read -r target; do
    [[ -z "$target" ]] && continue
    name="${target%%|*}"                # 去掉 | 后半
    name="${name## }"; name="${name%% }" # trim
    if [[ -z "${PAGES[$name]:-}" ]]; then
      push_error "$f" "$name"
    fi
  done < <(grep -oE '\[\[[^]]+\]\]' "$f" | sed -E 's/^\[\[|\]\]$//g')
done < <(find "$WIKI_ROOT/wiki" -type f -name '*.md' -print0)

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
