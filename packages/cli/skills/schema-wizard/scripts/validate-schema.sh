#!/usr/bin/env bash
# validate-schema.sh — 检查 schema 文件包含必要段落
# 用法：bash validate-schema.sh <schema-file>
# 输出：JSON { status: "pass"|"fail", errors: [...] }

set -euo pipefail

FILE="${1:-}"

json_fail() {
  local rule="$1" message="$2" file="${3:-$FILE}"
  jq -nc --arg f "$file" --arg r "$rule" --arg m "$message" \
    '{status:"fail", errors:[{file:$f, rule:$r, message:$m}]}'
}

if [[ -z "$FILE" ]]; then
  echo '{"status":"fail","errors":[{"file":"","rule":"usage","message":"用法：validate-schema.sh <file>"}]}'
  exit 1
fi

if [[ ! -f "$FILE" ]]; then
  json_fail "file-not-found" "schema 文件不存在"
  exit 1
fi

REQUIRED_SECTIONS=("## 目录约定" "## Frontmatter 规范" "## 链接规范" "## 工作流")
MISSING=()

for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -Fq "$section" "$FILE"; then
    MISSING+=("$section")
  fi
done

if (( ${#MISSING[@]} == 0 )); then
  jq -nc --arg f "$FILE" '{status:"pass", errors:[], file:$f}'
  exit 0
fi

ERRORS_JSON=$(
  printf '%s\n' "${MISSING[@]}" |
  jq -R --arg f "$FILE" \
    '{file:$f, rule:"missing-section", message:("缺少段落：" + .)}' |
  jq -s .
)

jq -nc --argjson errs "$ERRORS_JSON" '{status:"fail", errors:$errs}'
exit 1
