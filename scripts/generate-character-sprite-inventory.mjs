#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const chars = ['guanyu', 'zhaoyun', 'zhangfei', 'weiyan', 'huangzhong'];
const root = path.resolve('workplace/extracted/data/chars');
const groups = [
  ['P0', '基本移動', /^(idle|walk|run|turn|waiting)$/],
  ['P0', '基本攻擊', /^(attack1|attack2|attack3|chargeattack|attackbackward|attackboth|runattack|slide)$/],
  ['P0', '跳躍／著地', /^(jump|jumpattack2?|jumpdelay|jumpforward|land)$/],
  ['P0', '受傷／倒地／死亡', /^(pain|pain2|pain3|pain10|spain|bpain|shock|burn|fall|fall4|fall7|bdie|sdie|death|rise|respawn)$/],
  ['P1', '抓取互動', /^(grab|grabattack2?|grabbackward|grabbed|grabdown|grabforward|get)$/],
  ['P1', '必殺技（直接）', /^(special|special2|freespecial\d*)$/],
  ['P2', '腳本特效／連段', /^follow\d*$/],
  ['P2', '登場／選角', /^(spawn|select)$/],
];
function parse(file) {
  let anim;
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const a = line.match(/^\s*anim\s+(\S+)/i);
    if (a) { anim = a[1].toLowerCase(); continue; }
    const f = line.match(/^\s*frame\s+(\S+)/i);
    if (f && anim && f[1].toLowerCase() !== 'none') out.push({anim, frame: f[1].replaceAll('\\', '/')});
  }
  return out;
}
function relative(frame, char) {
  const prefix = `data/chars/${char}/`;
  return frame.toLowerCase().startsWith(prefix) ? frame.slice(prefix.length) : frame;
}
let doc = '# 五虎／魏延角色替換分鏡總表\n\n';
doc += '產生日期：2026-07-14；由五份主角色定義中每個 anim 與 Frame 行自動統計。資料只讀取 extracted，未修改原始素材。\n\n';
doc += '優先級：**P0**＝首個可玩替換版本必備；**P1**＝完整近戰／技能體驗；**P2**＝主體完成後處理。\n\n';
doc += '| 角色 | 優先級 | 動作群組（anim） | 唯一 GIF 分鏡檔 | Frame 引用次數 | GIF 檔名（相對角色目錄） |\n|---|---|---|---:|---:|---|\n';
const stats = [];
for (const char of chars) {
  const entries = parse(path.join(root, char, `${char}.txt`));
  const anims = [...new Set(entries.map(x => x.anim))];
  const claimed = new Set();
  for (const [priority, label, re] of groups) {
    const selected = anims.filter(a => re.test(a));
    selected.forEach(a => claimed.add(a));
    const frames = entries.filter(x => selected.includes(x.anim));
    const unique = [...new Set(frames.map(x => relative(x.frame, char)))];
    if (selected.length) doc += `| ${char} | ${priority} | ${label}<br><code>${selected.join(', ')}</code> | ${unique.length} | ${frames.length} | <code>${unique.join('</code><br><code>').replaceAll('|', '\\|')}</code> |\n`;
  }
  const selected = anims.filter(a => !claimed.has(a));
  const frames = entries.filter(x => selected.includes(x.anim));
  const unique = [...new Set(frames.map(x => relative(x.frame, char)))];
  if (selected.length) doc += `| ${char} | P2 | 其餘定義（請維持）<br><code>${selected.join(', ')}</code> | ${unique.length} | ${frames.length} | <code>${unique.join('</code><br><code>').replaceAll('|', '\\|')}</code> |\n`;
  stats.push([char, anims.length, new Set(entries.map(x => x.frame)).size, entries.length]);
}
doc += '\n## 主角色統計\n\n| 角色 | 動畫數 | 直接引用的唯一 GIF | Frame 引用總數 |\n|---|---:|---:|---:|\n';
for (const row of stats) doc += `| ${row.join(' | ')} |\n`;
doc += '\n## 分離模型（不列入上表的主角色 GIF）\n\n';
doc += '每名角色的 weapons 欄位指向 16 個獨立定義：關羽 g1…g16、趙雲 y1…y16、張飛 z1…z16、魏延 w1…w16、黃忠 h1…h16。這些檔案都宣告 animal 2 並載入 horse，屬於騎乘用的馬匹／騎乘實體，不是主角色的武器圖層；要保留騎乘關卡，必須另外替換或保留。\n\n';
doc += '黃忠主檔另載入 gongjfp、gongjz、gongjx；其對應 huangzhong/gong/ 下的弓、箭與效果實體（包含 gongjfx*、gongjx*）。射擊與相關必殺技要完整替換時，這也是獨立的遠程武器／投射物模型。\n\n';
doc += '## 替換規則\n\n按 P0 群組先做 GIF；保留檔名、影格尺寸與透明索引，且不要改動同一動畫周圍的 Offset、BBox、attack、Delay。重複列出的 GIF 檔只需製作一次。\n';
fs.writeFileSync('workplace/CHARACTER_SPRITE_INVENTORY.md', doc);
