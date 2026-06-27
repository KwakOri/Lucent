import { LucentArtistDetailPage } from '../_components/LucentArtistDetailPage';

const PROFILE_ITEMS = [
  { label: '생일', value: '준비중' },
  { label: '키', value: '준비중' },
  { label: '나이', value: '준비중' },
  { label: '팬네임', value: '준비중' },
  { label: '마마 (일러스트)', value: '준비중' },
  { label: '해시태그', value: '#푸콩' },
];

export default function PukongProjectPage() {
  return (
    <LucentArtistDetailPage
      lucentNo="No.03"
      nameLines={['푸콩']}
      romanName="Pukong"
      backgroundNameLines={['PU', 'KONG']}
      roleLabel="Lucent Artist"
      profileImage="/profile_pukong.png"
      imageAlt="푸콩"
      footerName="PUKONG"
      profileItems={PROFILE_ITEMS}
      storyLines={[
        '새로운 이야기를 준비하고 있습니다.',
        '푸콩의 자세한 소개는 곧 공개될 예정입니다.',
      ]}
      storyHighlight="Lucent에서 곧 만나요."
      theme={{
        cardFrom: '#edf7ff',
        cardTo: '#bbdcf8',
        accent: '#4a88b9',
        backgroundNameColor: 'rgba(122, 180, 231, 0.28)',
      }}
    />
  );
}
