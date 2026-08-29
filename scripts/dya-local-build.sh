#!/usr/bin/env bash
set -euo pipefail

# Build opt-in DYA Studio Level 3 firmware in an isolated west workspace.
# Generated files stay under .dya-local/ and do not alter stable config files.

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
workspace="$repo_root/.dya-local/level-3"
manifest_source="$repo_root/config/west-dya-level-3.yml"
config_source="$repo_root/config"
update_stamp="$workspace/.west-update.sha256"

# A shallow Zephyr checkout plus build artifacts still needs several GiB.
# Refuse early instead of leaving a partially checked-out workspace on a full
# development disk.
min_free_kib=8388608
free_kib=$(df -Pk "$repo_root" | awk 'NR == 2 { print $4 }')
if [[ -z "$free_kib" || "$free_kib" -lt "$min_free_kib" ]]; then
  echo "At least 8 GiB free disk space is recommended for the Level 3 workspace." >&2
  echo "Available: ${free_kib:-unknown} KiB" >&2
  exit 1
fi

if command -v west >/dev/null 2>&1; then
  west_cmd=(west)
elif command -v uvx >/dev/null 2>&1; then
  # Zephyr's generated-object scripts import elftools from west's Python env.
  west_cmd=(uvx --from west --with pyelftools --with protobuf west)
else
  echo "west is required. Install it with uv (for example: uv tool install west)." >&2
  exit 1
fi

# Prefer the locally installed GNU Arm Embedded toolchain when no Zephyr
# toolchain was selected by the caller. This keeps the experiment usable on
# macOS/Homebrew while still allowing an explicit Zephyr SDK selection.
if [[ -z "${ZEPHYR_TOOLCHAIN_VARIANT:-}" ]] && command -v arm-none-eabi-gcc >/dev/null 2>&1; then
  gcc_path=$(command -v arm-none-eabi-gcc)
  export ZEPHYR_TOOLCHAIN_VARIANT=gnuarmemb
  if [[ -z "${GNUARMEMB_TOOLCHAIN_PATH:-}" ]]; then
    export GNUARMEMB_TOOLCHAIN_PATH="${gcc_path%/bin/arm-none-eabi-gcc}"
  fi
fi

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{ print $1 }'
  else
    sha256sum "$1" | awk '{ print $1 }'
  fi
}

mkdir -p "$workspace/config" "$workspace/build"
cp "$manifest_source" "$workspace/config/west-dya-level-3.yml"

if [[ ! -d "$workspace/.west" ]]; then
  (
    cd "$workspace"
    "${west_cmd[@]}" init -l config --mf west-dya-level-3.yml
  )
fi

manifest_digest=$(sha256_file "$manifest_source")
previous_digest=""
if [[ -f "$update_stamp" ]]; then
  previous_digest=$(sed -n '1p' "$update_stamp")
fi

if [[ "$manifest_digest" != "$previous_digest" ]]; then
  (
    cd "$workspace"
    "${west_cmd[@]}" update --narrow
    "${west_cmd[@]}" zephyr-export
  )
  printf '%s\n' "$manifest_digest" > "$update_stamp"
else
  echo "West dependencies are unchanged; skipping west update."
fi

build_one() {
  local artifact="$1"
  local shield="$2"
  local snippet="${3:-}"
  local build_dir="$workspace/build/$artifact"
  local -a cmake_args=(
    "-DZMK_CONFIG=$config_source"
    "-DSHIELD=${shield};tom_oled"
    "-DKEYMAP_FILE=$config_source/${artifact}.keymap"
    "-DEXTRA_CONF_FILE=$config_source/experimental/dya-level-3.conf"
  )

  if [[ -n "$snippet" ]]; then
    cmake_args+=("-DSNIPPET=$snippet")
  fi

  (
    cd "$workspace"
    "${west_cmd[@]}" build -s "$workspace/zmk/app" -d "$build_dir" \
      -b xiao_ble -p auto -- "${cmake_args[@]}"
  )
}

build_one tomkey_L3 tomkey_L3 studio-rpc-usb-uart
build_one tomkey_R3 tomkey_R3

echo
echo "Build completed. UF2 files:"
find "$workspace/build" -type f -name '*.uf2' -print | sort
echo
echo "Flash only after checking the UF2/board role:"
echo "  tomkey_L3 -> build/tomkey_L3/zephyr/zmk.uf2 (Central)"
echo "  tomkey_R3 -> build/tomkey_R3/zephyr/zmk.uf2 (Peripheral)"
