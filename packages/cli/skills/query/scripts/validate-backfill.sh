#!/usr/bin/env bash
# validate-backfill.sh — 校验单个回填页的最小要求
# 用法：bash validate-backfill.sh <file>
set -eo pipefail

FILE="${1:-}"
[[ -f "$FILE" ]] || {
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$FILE\",\"rule\":\"file-not-found\",\"message\":\"文件不存在\"}]}"
  exit 1
}

extract_frontmatter() {
  awk '/^---$/{c++; next} c==1{print} c==2{exit}' "$1"
}
get_field() {
  echo "$1" | awk -v k="$2" '$0 ~ "^"k":"{sub("^"k":[ ]*",""); print; exit}'
}

ERRORS="[]"
push() { ERRORS=$(jq -c --arg f "$1" --arg r "$2" --arg m "$3" '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS"); }

fm=$(extract_frontmatter "$FILE")
[[ -z "$fm" ]] && push "$FILE" "missing-frontmatter" "未找到 --- 块"

type_val=$(get_field "$fm" type)
title_val=$(get_field "$fm" title)
created_val=$(get_field "$fm" created)
updated_val=$(get_field "$fm" updated)

[[ -z "$type_val"    ]] && push "$FILE" "missing-required-field" "缺 type"
[[ -z "$title_val"   ]] && push "$FILE" "missing-required-field" "缺 title"
[[ -z "$created_val" ]] && push "$FILE" "missing-required-field" "缺 created"
[[ -z "$updated_val" ]] && push "$FILE" "missing-required-field" "缺 updated"

if [[ "$type_val" == "summary" ]]; then
  [[ -z "$(get_field "$fm" sources)" ]] && push "$FILE" "missing-required-field" "summary 缺 sources"
fi

# 正文是否有 [[X]]
body=$(awk '/^---$/{c++; next} c>=2{print}' "$FILE")
if ! grep -qE '\[\[[^]]+\]\]' <<< "$body"; then
  push "$FILE" "no-links" "回填页正文没有任何 [[X]] 反向链接"
fi

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc --arg f "$FILE" '{status:"pass", errors:[], file:$f}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
