import { LucentArtistDetailPage } from '../_components/LucentArtistDetailPage';

const PROFILE_ITEMS = [
  { label: '생일', value: '준비중' },
  { label: '키', value: '준비중' },
  { label: '나이', value: '준비중' },
  { label: '팬네임', value: '준비중' },
  { label: '마마 (일러스트)', value: '준비중' },
  { label: '해시태그', value: '#리피' },
];

export default function LeafyProjectPage() {
  return (
    <LucentArtistDetailPage
      lucentNo="No.02"
      nameLines={['리피']}
      romanName="Leafy"
      backgroundNameLines={['LEA', 'FY']}
      roleLabel="Lucent Artist"
      profileImage="/profile_leafy.png"
      imageAlt="리피"
      footerName="LEAFY"
      profileItems={PROFILE_ITEMS}
      storyLines={[
        '새로운 이야기를 준비하고 있습니다.',
        '리피의 자세한 소개는 곧 공개될 예정입니다.',
      ]}
      storyHighlight="Lucent에서 곧 만나요."
      theme={{
        cardFrom: '#eef9ea',
        cardTo: '#d8f0d7',
        accent: '#d8c451',
        backgroundNameColor: 'rgba(151, 204, 166, 0.28)',
      }}
    />
  );
}
