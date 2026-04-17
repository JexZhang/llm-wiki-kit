#!/usr/bin/env bash
# check-frontmatter.sh — 全量 frontmatter 合规检查（lint 用，ingest 的超集）
# 用法：bash check-frontmatter.sh <wiki-root>
set -eo pipefail

WIKI_ROOT="${1:-.}"
if [[ ! -d "$WIKI_ROOT/wiki" ]]; then
  echo "{\"status\":\"fail\",\"errors\":[{\"file\":\"$WIKI_ROOT\",\"rule\":\"missing-wiki-dir\",\"message\":\"找不到 wiki/ 子目录\"}]}"
  exit 1
fi

# 目录 → 期望 type
declare -A DIR_TYPE=(
  [domains]=domain
  [entities]=entity
  [concepts]=concept
  [playbooks]=playbook
  [summaries]=summary
)

ERRORS="[]"
push_error() {
  local file="$1" rule="$2" message="$3"
  ERRORS=$(jq -c --arg f "$file" --arg r "$rule" --arg m "$message" \
    '. + [{file:$f, rule:$r, message:$m}]' <<< "$ERRORS")
}

# 提取 frontmatter 块（第一个 --- 与下一个 --- 之间）
extract_frontmatter() {
  awk '/^---$/{c++; next} c==1{print} c==2{exit}' "$1"
}

get_field() {
  echo "$1" | awk -v k="$2" '$0 ~ "^"k":"{sub("^"k":[ ]*",""); print; exit}'
}

for dir in "${!DIR_TYPE[@]}"; do
  expected="${DIR_TYPE[$dir]}"
  d="$WIKI_ROOT/wiki/$dir"
  [[ -d "$d" ]] || continue
  while IFS= read -r -d '' file; do
    fm=$(extract_frontmatter "$file")
    if [[ -z "$fm" ]]; then
      push_error "$file" "missing-frontmatter" "未找到 --- frontmatter 块"
      continue
    fi
    type_val=$(get_field "$fm" type)
    title_val=$(get_field "$fm" title)
    created_val=$(get_field "$fm" created)
    updated_val=$(get_field "$fm" updated)

    [[ -z "$type_val"    ]] && push_error "$file" "missing-required-field" "缺少 type"
    [[ -z "$title_val"   ]] && push_error "$file" "missing-required-field" "缺少 title"
    [[ -z "$created_val" ]] && push_error "$file" "missing-required-field" "缺少 created"
    [[ -z "$updated_val" ]] && push_error "$file" "missing-required-field" "缺少 updated"

    case "$type_val" in
      summary|domain|entity|concept|playbook) ;;
      "") ;;
      *) push_error "$file" "invalid-type" "type 值非法：$type_val" ;;
    esac

    if [[ -n "$type_val" && -n "$expected" && "$type_val" != "$expected" ]]; then
      push_error "$file" "type-dir-mismatch" "目录 $dir 期望 type=$expected，实际 $type_val"
    fi

    if [[ "$expected" == "summary" ]]; then
      sources_val=$(get_field "$fm" sources)
      [[ -z "$sources_val" ]] && push_error "$file" "missing-required-field" "summary 页缺少 sources"
    fi
  done < <(find "$d" -maxdepth 1 -type f -name '*.md' -print0)
done

count=$(jq length <<< "$ERRORS")
if (( count == 0 )); then
  jq -nc '{status:"pass", errors:[]}'
  exit 0
else
  jq -nc --argjson errs "$ERRORS" '{status:"fail", errors:$errs}'
  exit 1
fi
