# 本机字体清单

这些字体从当前用户字体目录复制而来，仅供本机个人项目预览。字体二进制目录已写入 `.gitignore`，避免误提交、部署或公开分发。公开上线前需要逐一确认授权，或替换为具有明确 Web Font 授权的版本。

| 分类 | 项目文件 | 内部字体家族 | CSS 名称 |
| --- | --- | --- | --- |
| 中日韩衬线/展示 | `cjk-serif/matisse-pro-eb.otf` | FOT-Matisse Pro EB | `Local Matisse Pro` |
| 中日韩衬线/展示 | `cjk-serif/aa-wansong-web.ttf` | Aa顽宋 | `Local Aa Wansong` |
| 中日韩衬线/展示 | `cjk-serif/ruizi-rock-song.ttf` | 锐字摇滚滚石宋-闪 特宋 | `Local Ruizi Rock Song` |
| 无衬线 | `sans-serif/cascadia-next-sc.ttf` | Cascadia Next SC | `Local Cascadia Next SC` |
| 展示黑体 | `display/dela-gothic-one.ttf` | Dela Gothic One | `Local Dela Gothic One` |
| 手写/书法 | `handwriting/teguse-kanaka.ttf` | 073 TEGUSE Kanaka Font | `Local Teguse Kanaka` |
| 拉丁展示 | `latin-display/quinttor-regular.ttf` | Quinttor | `Local Quinttor` |
| 待确认 | `unclassified/yyb.ttf` | yyb | `Local YYB` |

所有字体已在 `src/fonts.css` 中通过 `@font-face` 注册，并提供对应的 CSS 变量。当前界面不会自动混用这些字体，后续可以有选择地应用。

`aa-wansong.ttf` 是保留的原始文件；`aa-wansong-web.ttf` 是移除异常 `vhea/vmtx` 纵向度量表后的网页兼容副本。当前应用只使用修复副本，横排中文不受影响。
