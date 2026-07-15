# Cross-platform build and packaging

OpenBOR has two independently built deliverables:

1. **Game module** — `wof.pak`, containing the modified art, definitions,
   levels, and scripts.
2. **OpenBOR engine** — a native executable (or `.app`) for each target OS.

Build one standard PAK and pair it with one native engine build per platform.

> The supplied 2015 `wof.pak` must not be used with the current source tree.
> Its file offsets have a non-standard additive bias. Current OpenBOR validates
> physical PAK offsets and will reject it. Rebuilding from `extracted/` produces
> a standard PAK32 that the current engine supports.

## 1. Module preparation (documentation only)

The module is the game-content PAK: artwork, definitions, levels, and scripts.
Its preparation is deliberately outside this document's execution steps. When
the module is ready, it must be packaged in a current OpenBOR-compatible PAK
format before release.

The supplied 2015 PAK has legacy pathname and offset details. Treat it as input
for analysis; make and validate a separate release PAK later. Do not overwrite
the supplied archive while developing.

## 2. Linux default: isolated Docker build

For this legacy GIF module, use the tested `v7533` Docker path first. It keeps
all compiler packages out of the host and mounts the OpenBOR checkout
read-only:

```sh
BUILD_PARENT="$(mktemp -d /tmp/openbor-linux-docker-XXXXXX)"
scripts/build-openbor-linux-docker.sh \
  --source ../openbor --ref v7533 --output "$BUILD_PARENT/build"
```

See [Docker isolated build and smoke test](DOCKER_LINUX_BUILD.md) for the
version-compatibility decision and end-to-end raw-data verification.

## 3. Compile native target releases

The source checkout at `../openbor` uses CMake. Native builds are preferred:
Linux builds Linux, Windows builds Windows in MSYS2, and macOS builds macOS.
That avoids distributing a cross-compiled executable that cannot be tested on
its target OS.

### Linux x86-64 (manual alternative)

On Ubuntu/Debian, install the dependencies used by the upstream CI:

```sh
sudo apt-get update
sudo apt-get install build-essential git cmake zstd \
  libsdl2-dev libvorbis-dev libpng-dev libvpx-dev

cmake -S ../openbor -B ../openbor/build.warriors-linux \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_LINUX=ON -DTARGET_ARCH=AMD64
cmake --build ../openbor/build.warriors-linux --config Release --parallel
```

Output: `../openbor/engine/releases/LINUX/OpenBOR`.

### Windows x64 and x86

Use **MSYS2**, not a Unix shell with a random MinGW compiler. Open an `UCRT64`
shell for x64 (or `MINGW32` for x86), install the matching packages, then run
the same CMake workflow.

```sh
# UCRT64 / x64 example
pacman -S --needed mingw-w64-ucrt-x86_64-gcc \
  mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-SDL2 \
  mingw-w64-ucrt-x86_64-zlib mingw-w64-ucrt-x86_64-libvorbis \
  mingw-w64-ucrt-x86_64-libogg mingw-w64-ucrt-x86_64-libpng \
  mingw-w64-ucrt-x86_64-libvpx

cmake -S . -B build.warriors-win64 \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_WIN=ON -DTARGET_ARCH=AMD64
cmake --build build.warriors-win64 --config Release --parallel
```

Run these commands from the root of the OpenBOR source checkout. Output:
`engine/releases/WINDOWS/OpenBOR-x64.exe`. For 32-bit Windows, use the
`mingw-w64-i686-*` packages in the `MINGW32` shell and set `TARGET_ARCH=x86`.

### macOS

On a Mac with Xcode Command Line Tools and Homebrew:

```sh
xcode-select --install
brew install cmake sdl2 libvorbis libogg libvpx libpng

cmake -S . -B build.warriors-macos \
  -DCMAKE_BUILD_TYPE=Release -DBUILD_DARWIN=ON -DTARGET_ARCH=arm64
cmake --build build.warriors-macos --config Release --parallel
```

Run these commands from the OpenBOR source root. Output:
`engine/releases/DARWIN/OpenBOR.app`. The current CMake configuration is
arm64-first. Its `TARGET_ARCH=universal` route additionally requires an
x86-64 Homebrew installation and is best attempted only after an arm64 build
works.

## 4. Assemble each release

Copy the same rebuilt module into the platform-specific Paks directory:

| Platform | Engine output | Module destination |
| --- | --- | --- |
| Linux | `engine/releases/LINUX/OpenBOR` | `engine/releases/LINUX/Paks/wof.pak` |
| Windows | `engine/releases/WINDOWS/OpenBOR-*.exe` | `engine/releases/WINDOWS/Paks/wof.pak` |
| macOS | `engine/releases/DARWIN/OpenBOR.app` | `OpenBOR.app/Contents/Resources/Paks/wof.pak` |

Keep the generated `COMPILING.txt`, `LICENSE.txt`, `README.txt`, and
`translation.txt` that CMake places in `engine/releases/` with the release.
Do not place the PAK beside the executable: the engine discovers modules from
its `Paks/` folder.

## Recommended validation order

1. Prepare a release PAK from the approved module and run it on Linux.
2. Replace one Guan Yu GIF with a same-sized test image; verify the animation,
   collision, and palette transparency.
3. Build and test the same PAK on Windows and macOS.
4. Automate native builds in GitHub Actions using the OpenBOR source's existing
   `.github/workflows/build_and_release.yml` as the platform/dependency matrix.

The PAK should be byte-identical across all targets; only the engine binary and
its platform runtime packaging differ.
