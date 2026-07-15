# OpenBOR 引擎編譯手冊

本文件只處理 **OpenBOR 引擎** 的原生編譯。遊戲內容（角色圖、關卡、腳本）屬於另一份模組 PAK；同一個已驗證的模組 PAK 可搭配 Linux、Windows、macOS 的引擎版本使用。

## 0. 原則與目標

- 使用 [DCurrent/openbor](https://github.com/DCurrent/openbor) 的原始碼與其 CMake 設定。
- 優先在目標作業系統原生編譯與測試：Linux 建 Linux、Windows 建 Windows、macOS 建 macOS。
- 先成功編譯「未改引擎」版本，再進行引擎程式碼修改。
- 編譯產物會由 CMake 自動放進 `engine/releases/`；不要手動從 build 目錄挑選未完成的中間檔。
- Linux 開發預設使用 [Docker 隔離編譯流程](DOCKER_LINUX_BUILD.md)，不在 host 安裝編譯依賴。
- 本舊模組目前 pin `v7533` 保留 GIF loader；master Build 7832 只接受部分 PNG 流程，不能直接載入現有 raw data。

## 1. 取得原始碼

```sh
git clone https://github.com/DCurrent/openbor.git
cd openbor
git submodule update --init --recursive
```

建議記錄本次使用的 commit，讓之後能重現相同的引擎版本：

```sh
git rev-parse HEAD
```

## 2. Linux x86-64

建議先執行：

```sh
BUILD_PARENT="$(mktemp -d /tmp/openbor-linux-docker-XXXXXX)"
scripts/build-openbor-linux-docker.sh \
  --source ../openbor --ref v7533 --output "$BUILD_PARENT/build"
```

本機已用 `/home/anr2/openbor-study/openbor` 的 `v7533` checkout 實測過相同流程；build 產物與 smoke gate 證據見：

- [Getter Linux smoke evidence](../research/GUANYU_LINUX_SMOKE.md)
- [ν Gundam Linux smoke evidence](../research/NU_GUNDAM_LINUX_SMOKE.md)

以下 host 安裝方式只保留作為上游原生編譯參考；本專案工作站不使用它：

以下以 Ubuntu／Debian 為例：

```sh
sudo apt-get update
sudo apt-get install build-essential git cmake zstd \
  libsdl2-dev libvorbis-dev libpng-dev libvpx-dev

cmake -S . -B build.linux-x64 \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_LINUX=ON \
  -DTARGET_ARCH=AMD64
cmake --build build.linux-x64 --config Release --parallel
```

驗證與輸出：

```sh
file engine/releases/LINUX/OpenBOR
./engine/releases/LINUX/OpenBOR
```

Linux 發行目錄中的模組位置：`engine/releases/LINUX/Paks/`。

## 3. Windows x64 與 x86

請使用 [MSYS2](https://www.msys2.org/)；不要在一般 CMD、PowerShell 或未設定完整依賴的 MinGW 環境直接編譯。

### Windows x64

1. 開啟 **MSYS2 UCRT64** shell。
2. 安裝依賴：

```sh
pacman -Syu
pacman -S --needed \
  mingw-w64-ucrt-x86_64-gcc \
  mingw-w64-ucrt-x86_64-cmake \
  mingw-w64-ucrt-x86_64-SDL2 \
  mingw-w64-ucrt-x86_64-zlib \
  mingw-w64-ucrt-x86_64-libvorbis \
  mingw-w64-ucrt-x86_64-libogg \
  mingw-w64-ucrt-x86_64-libpng \
  mingw-w64-ucrt-x86_64-libvpx
```

3. 在 OpenBOR repository 根目錄編譯：

```sh
cmake -S . -B build.windows-x64 \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_WIN=ON \
  -DTARGET_ARCH=AMD64
cmake --build build.windows-x64 --config Release --parallel
```

輸出：`engine/releases/WINDOWS/OpenBOR-x64.exe`。

### Windows x86

開啟 **MSYS2 MINGW32** shell，將上述套件替換為 `mingw-w64-i686-*`，並使用：

```sh
cmake -S . -B build.windows-x86 \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_WIN=ON \
  -DTARGET_ARCH=x86
cmake --build build.windows-x86 --config Release --parallel
```

輸出：`engine/releases/WINDOWS/OpenBOR-x86.exe`。

Windows 發行目錄中的模組位置：`engine/releases/WINDOWS/Paks/`。

## 4. macOS

目前原始碼的 macOS CMake 設定優先支援 Apple Silicon（arm64）。在 Mac 上：

```sh
xcode-select --install
brew install cmake sdl2 libvorbis libogg libvpx libpng

git clone https://github.com/DCurrent/openbor.git
cd openbor
cmake -S . -B build.macos-arm64 \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_DARWIN=ON \
  -DTARGET_ARCH=arm64
cmake --build build.macos-arm64 --config Release --parallel
```

輸出：`engine/releases/DARWIN/OpenBOR.app`。

啟動與模組位置：

```sh
open engine/releases/DARWIN/OpenBOR.app
# 模組放到：engine/releases/DARWIN/OpenBOR.app/Contents/Resources/Paks/
```

Universal binary 需要同時準備 x86-64 Homebrew 相依庫；請先完成 arm64 測試版再規劃。

## 5. 產物檢查與發行前測試

每個平台都應確認：

1. 引擎可啟動，且能看到或載入 `Paks/` 內的測試模組。
2. 以相同模組 PAK 跑過選角、基本移動、攻擊、跳躍與關卡載入。
3. 將 `COMPILING.txt`、`LICENSE.txt`、`README.txt`、`translation.txt` 與引擎一起保留；CMake 會放到 `engine/releases/`。
4. 記錄 OpenBOR commit、作業系統版本、編譯器與 CMake 版本。

## 6. 常見問題

| 現象 | 檢查方式／處理 |
| --- | --- |
| CMake 找不到 SDL2、PNG、Vorbis 或 VPX | 確認是在正確的 OS shell 安裝「開發套件」；Windows 必須在對應 MSYS2 shell 執行 CMake。 |
| Windows 出現 linker 或 `windres` 錯誤 | 檢查 `gcc`、`cmake` 與 `windres` 是否都來自同一個 UCRT64 或 MINGW32 環境。 |
| macOS 找不到 Homebrew library | 使用 Homebrew 安裝相依庫；Apple Silicon 預設前綴應為 `/opt/homebrew`。 |
| 引擎能啟動但找不到遊戲 | 模組 PAK 必須放在 `Paks/`，不可只放在可執行檔旁。 |
| 新版引擎無法讀取舊 `wof.pak` | 這份研究樣本含舊式封包細節。不要覆寫原檔；正式發行時建立並測試一份與目前引擎相容的模組 PAK。 |

## 相關文件

- [Docker 隔離編譯與 smoke test](DOCKER_LINUX_BUILD.md)
- [跨平台建置與發行摘要](BUILD.md)
- [角色素材規格](SPRITE_ART_SPEC.md)
- [角色替換分鏡總表](../research/CHARACTER_SPRITE_INVENTORY.md)
