export type BgmTrack = {
  id: string;
  title: string;
  artist: string;
  version: string;
  enabled: boolean;
  sourceUrl: string;
  licenseUrl: string;
  licenseStatus: 'published-noncommercial' | 'pending';
  licenseNote: string;
  asset: null | { src: string; sha256: string; acquiredAt: string; provenance: string };
  analysis?: { src: string; audioSha256: string };
};

// Never substitute a stream preview or synthesized melody for these recordings.
// Add an asset only after obtaining the official file and recording its provenance.
export const bgmTracks: readonly BgmTrack[] = [
  { id: 'panopticon', title: 'パノプティコン', artist: 'r-906', version: '2019 原版', enabled: false,
    sourceUrl: 'https://ototoy.jp/_/default/p/3457798', licenseUrl: 'https://arukuremu.com/faq/',
    licenseStatus: 'pending', licenseNote: '原唱文件与个人网站整曲播放适用范围尚待确认。', asset: null },
  { id: 'voidroid', title: 'ボイドロイド', artist: 'r-906', version: '原版', enabled: false,
    sourceUrl: 'https://ototoy.jp/_/default/p/1792015', licenseUrl: 'https://arukuremu.com/faq/',
    licenseStatus: 'pending', licenseNote: '非 Club Edit；原唱文件与网站播放许可尚待确认。', asset: null },
  { id: 'world-execute-me', title: 'world.execute(me);', artist: 'Mili', version: 'Miracle Milk', enabled: false,
    sourceUrl: 'https://ototoy.jp/_/default/p/100105', licenseUrl: 'https://projectmili.com/copyright-guidelines',
    licenseStatus: 'pending', licenseNote: '非 Key Ingredient；原唱文件与网站播放许可尚待确认。', asset: null },
  { id: 'tooku-instrumental', title: '遠く、遠く、遠く。', artist: '中瀬ミル', version: '官方伴奏', enabled: true,
    analysis: { src: '/audio/bgm/analysis/tooku-instrumental.json', audioSha256: 'bbda216969a46d926f8aa2037eccc5e678bf637db6937f615f3b7868826a195d' },
    sourceUrl: 'https://piapro.jp/t/jIZa', licenseUrl: 'https://piapro.jp/t/jIZa',
    licenseStatus: 'published-noncommercial', licenseNote: '作者在 Piapro 公开发布的伴奏，标注仅限非营利使用。著作权归原作者所有。',
    asset: { src: '/audio/bgm/tooku-instrumental.mp3', sha256: 'bbda216969a46d926f8aa2037eccc5e678bf637db6937f615f3b7868826a195d', acquiredAt: '2026-09-23', provenance: 'Piapro jIZa，登录后经用户确认同意非营利许可，通过作品文件下载按钮取得原始 MP3。' } },
  { id: 'suishitai-instrumental', title: '水死体は恋したい', artist: 'LonePi', version: '官方伴奏', enabled: true,
    analysis: { src: '/audio/bgm/analysis/suishitai-instrumental.json', audioSha256: '350ba032811efa827869749a64b61842a9826121a10bcd3d855543559243d3c8' },
    sourceUrl: 'https://piapro.jp/t/hCZQ', licenseUrl: 'https://piapro.jp/t/hCZQ',
    licenseStatus: 'published-noncommercial', licenseNote: '作者在 Piapro 公开发布的伴奏，标注仅限非营利使用；商业用途需另行咨询作者。著作权归原作者所有。',
    asset: { src: '/audio/bgm/suishitai-instrumental.mp3', sha256: '350ba032811efa827869749a64b61842a9826121a10bcd3d855543559243d3c8', acquiredAt: '2026-09-23', provenance: 'Piapro hCZQ，登录后经用户确认同意非营利许可；用户从同一官方下载入口保存并提供文件路径。' } },
];

export function canPlayBgm(track: BgmTrack): boolean {
  return track.enabled && track.licenseStatus === 'published-noncommercial'
    && !!track.asset?.src.startsWith('/audio/bgm/') && /^[a-f0-9]{64}$/i.test(track.asset.sha256);
}

export const visibleBgmTracks = bgmTracks.filter(track => track.enabled);
