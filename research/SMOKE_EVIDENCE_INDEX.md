# Smoke evidence index

This index tracks the smoke gates that have been proven in the current repo state. It is not a completion claim; it only records what has been run and what each run proves.

| Slice | Evidence note | Proven gate | Still open |
| --- | --- | --- | --- |
| ν Gundam | [NU_GUNDAM_RUNNER_QA.md](NU_GUNDAM_RUNNER_QA.md) | Headless OpenBOR smoke reaches `Loading models... Done!` for the integrated ν tree; runtime validator also passes against canonical manifest anchors. | Visible runner QA, Stage 1 gameplay, Windows/macOS runner smoke, production in-betweens, Funnel P1 |
| Guanyu | [GUANYU_LINUX_SMOKE.md](GUANYU_LINUX_SMOKE.md) | Headless OpenBOR smoke reaches `Loading models... Done!` for the current Getter v2 tree. | Visible gameplay / screenshot verification, Stage 1 gameplay loop, Windows/macOS runner smoke, production animation closure |
| Stage01 | [STAGE01_LINUX_SMOKE.md](STAGE01_LINUX_SMOKE.md) | Headless OpenBOR smoke reaches `Loading models... Done!` for the Stage01 bg-box tree. | Windows/macOS runner smoke, visible gameplay / screenshot verification, remaining Stage01 production art |
| Lidian | [LIDIAN_LINUX_SMOKE.md](LIDIAN_LINUX_SMOKE.md) | Headless OpenBOR smoke reaches `Loading models... Done!` for the current boss P0 tree. | Windows/macOS runner smoke, visible gameplay / screenshot verification, remaining boss production art |
| Huangzhong | [HUANGZHONG_LINUX_SMOKE.md](HUANGZHONG_LINUX_SMOKE.md) | Headless OpenBOR smoke reaches `Loading models... Done!` for the current player P0 tree. | Windows/macOS runner smoke, visible gameplay / screenshot verification, remaining Huangzhong production art |

## Interpretation

- These smoke runs prove loader stability on Linux for the current slices.
- They do not prove visible gameplay, player input flow, or production completeness.
- Windows and macOS runner smoke remain pending across the project.
