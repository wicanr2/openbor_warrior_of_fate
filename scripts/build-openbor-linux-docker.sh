#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repository_root=$(cd -- "$script_dir/.." && pwd)
source_input="$repository_root/../openbor"
output_input=/tmp/openbor-linux-docker
image=openbor-linux-build:local
source_ref=v7533
platform=linux/amd64

usage() {
  cat <<'EOF'
Usage:
  scripts/build-openbor-linux-docker.sh [options]

Options:
  --source PATH   OpenBOR source checkout mounted read-only (default: ../openbor)
  --output PATH   New build/output directory (default: /tmp/openbor-linux-docker)
  --image NAME    Local builder image tag (default: openbor-linux-build:local)
  --ref REF       Tag/commit built from the copied checkout (default: v7533)
  --help          Show this help

The source checkout is mounted read-only. Dependencies are installed only in
the Docker image; all generated files go to a new --output directory.
EOF
}

while (($#)); do
  case "$1" in
    --source)
      [[ $# -ge 2 ]] || { echo '--source requires a path' >&2; exit 2; }
      source_input=$2
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || { echo '--output requires a path' >&2; exit 2; }
      output_input=$2
      shift 2
      ;;
    --image)
      [[ $# -ge 2 ]] || { echo '--image requires a name' >&2; exit 2; }
      image=$2
      shift 2
      ;;
    --ref)
      [[ $# -ge 2 ]] || { echo '--ref requires a tag or commit' >&2; exit 2; }
      source_ref=$2
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

source_dir=$(readlink -f "$source_input")
output=$(readlink -m "$output_input")

[[ -d "$source_dir/.git" ]] || { echo "OpenBOR Git checkout is missing: $source_dir" >&2; exit 1; }
[[ ! -e "$output" ]] || { echo "Output already exists; refusing to overwrite: $output" >&2; exit 1; }

docker build --platform "$platform" --tag "$image" "$repository_root/docker/openbor-linux"
mkdir -p "$output"

docker run --rm \
  --platform "$platform" \
  --user "$(id -u):$(id -g)" \
  --env HOME=/tmp \
  --env OPENBOR_SOURCE_REF="$source_ref" \
  --volume "$source_dir:/source:ro" \
  --volume "$output:/output" \
  "$image" \
  bash -lc '
    set -euo pipefail
    cp -a /source/. /output/source
    git -C /output/source checkout --detach "$OPENBOR_SOURCE_REF"

    if [[ -f /output/source/CMakeLists.txt ]]; then
      cmake -S /output/source -B /output/source/build \
        -DCMAKE_BUILD_TYPE=Release -DBUILD_LINUX=ON -DTARGET_ARCH=AMD64
      cmake --build /output/source/build --config Release --parallel
    elif [[ -f /output/source/engine/Makefile ]]; then
      cd /output/source/engine
      bash ./version.sh
      # v7533 predates GCC 13 diagnostics. Keep warnings visible, but do not
      # turn new compiler warnings into fatal errors in this disposable copy.
      sed -i "s/ -Werror / /" Makefile
      export TARGET_ARCH=amd64
      . ./environ.sh 4
      make --jobs "$(nproc)" BUILD_LINUX=1
      mkdir -p releases/LINUX/OpenBOR/{Logs,Paks,Saves,ScreenShots}
      mv OpenBOR releases/LINUX/OpenBOR/OpenBOR
    else
      echo "No supported CMakeLists.txt or engine/Makefile found" >&2
      exit 1
    fi
  '

binary="$output/source/engine/releases/LINUX/OpenBOR"
if [[ ! -f "$binary" || ! -x "$binary" ]]; then
  binary="$output/source/engine/releases/LINUX/OpenBOR/OpenBOR"
fi
[[ -f "$binary" && -x "$binary" ]] || { echo "Expected binary is missing: $binary" >&2; exit 1; }

{
  printf 'source_ref=%s\n' "$source_ref"
  printf 'source_commit=%s\n' "$(git -C "$output/source" rev-parse HEAD)"
  printf 'platform=%s\n' "$platform"
  printf 'builder_image=%s\n' "$image"
  printf 'builder_image_id=%s\n' "$(docker image inspect "$image" --format '{{.Id}}')"
  printf 'binary=%s\n' "$binary"
  printf 'binary_sha256=%s\n' "$(sha256sum "$binary" | cut -d ' ' -f 1)"
} > "$output/BUILD-INFO.txt"

echo "OpenBOR Linux Docker build complete"
echo "Binary: $binary"
echo "Build info: $output/BUILD-INFO.txt"
file "$binary"
sha256sum "$binary"
