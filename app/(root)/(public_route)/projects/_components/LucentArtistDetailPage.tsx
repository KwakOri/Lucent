import styles from '../miruru/miruru-fonts.module.css';

type ProfileItem = {
  label: string;
  value: string;
};

type LucentArtistDetailPageProps = {
  lucentNo: string;
  nameLines: string[];
  romanName: string;
  backgroundNameLines: string[];
  roleLabel: string;
  profileImage: string;
  imageAlt: string;
  footerName: string;
  profileItems: ProfileItem[];
  storyLines: string[];
  storyHighlight?: string;
  theme?: {
    cardFrom?: string;
    cardTo?: string;
    accent?: string;
    backgroundNameColor?: string;
  };
};

export function LucentArtistDetailPage({
  lucentNo,
  nameLines,
  romanName,
  backgroundNameLines,
  roleLabel,
  profileImage,
  imageAlt,
  footerName,
  profileItems,
  storyLines,
  storyHighlight,
  theme = {},
}: LucentArtistDetailPageProps) {
  const accent = theme.accent ?? '#f4d03f';

  return (
    <main
      className={`${styles.referenceFonts} min-h-screen bg-[#FFFFFF] text-[#1a1a2e]`}
    >
      <section className="relative isolate overflow-hidden px-5 pb-0 pt-14 sm:px-8 lg:px-14 lg:pt-16">
        <div
          aria-hidden="true"
          className={`${styles.cormorant} absolute right-4 top-20 -z-10 text-right text-[5.4rem] font-semibold leading-[0.8] tracking-[-0.01em] sm:right-8 sm:top-24 sm:text-[9rem] lg:right-[100px] lg:top-[150px] lg:text-[188px]`}
          style={{
            color: theme.backgroundNameColor ?? 'rgba(168, 213, 226, 0.30)',
          }}
        >
          {backgroundNameLines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-end lg:gap-16">
          <div className="relative w-full max-w-[430px] flex-none">
            <div
              className={`${styles.cormorant} mb-4 ml-3 text-xs font-semibold tracking-[0.4em] text-[#9bb3cf] sm:absolute sm:left-8 sm:top-[-2.125rem] sm:mb-0 sm:ml-0`}
            >
              LUCENT / {lucentNo}
            </div>
            <div
              className="relative h-[26rem] overflow-hidden rounded-t-[13rem] rounded-b-md shadow-[0_18px_44px_rgba(74,136,185,0.16)] sm:h-[37.5rem]"
              style={{
                background: `linear-gradient(170deg, ${theme.cardFrom ?? '#eaf4fd'}, ${theme.cardTo ?? '#dceefe'})`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute right-7 top-14 text-base"
                style={{ color: accent }}
              >
                *
              </span>
              <span
                aria-hidden="true"
                className="absolute left-8 top-36 text-sm text-[#7fb0e0]"
              >
                *
              </span>
              <img
                src={profileImage}
                alt={imageAlt}
                className="absolute bottom-0 left-1/2 w-[25rem] max-w-none -translate-x-1/2 sm:w-[27rem]"
              />
            </div>
          </div>

          <div className="w-full pb-14 text-left lg:flex-1 lg:pb-10">
            <div
              className="mb-7 h-0.5 w-12"
              style={{ backgroundColor: accent }}
            />
            <h1
              className={`${styles.batang} text-5xl font-bold leading-[1.14] tracking-[0.01em] sm:text-6xl lg:text-[4.75rem]`}
            >
              {nameLines.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
            <p
              className={`${styles.cormorant} mt-5 text-2xl italic tracking-[0.18em] text-[#6f8db3] sm:text-[1.75rem]`}
            >
              {romanName}
            </p>
            <div className="mt-7 inline-flex rounded-full border border-[#cfe0f0] px-5 py-2 text-xs font-semibold tracking-[0.16em] text-[#4a88b9]">
              {roleLabel}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8 lg:px-14 lg:py-20">
        <div
          className={`${styles.cormorant} text-xs font-semibold tracking-[0.4em] text-[#9bb3cf]`}
        >
          STORY
        </div>
        <div className="mt-4 text-sm" style={{ color: accent }}>
          *
        </div>
        <p
          className={`${styles.batang} mx-auto mt-6 max-w-3xl space-y-3 text-lg leading-relaxed text-[#33384a] sm:space-y-0 sm:text-xl sm:leading-[2.2]`}
        >
          {storyLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
          {storyHighlight && (
            <span className="block text-[#6f8db3]">{storyHighlight}</span>
          )}
        </p>
      </section>

      <section className="bg-linear-to-b from-[#f2f6ef] to-[#eef4fb] px-5 py-16 sm:px-8 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div
            className={`${styles.cormorant} mb-6 text-xs font-semibold tracking-[0.4em] text-[#9bb3cf]`}
          >
            PROFILE
          </div>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profileItems.map((item) => (
              <div
                key={item.label}
                className="flex min-h-28 flex-col justify-center rounded-xl border border-white/70 bg-white/45 px-5 py-5 backdrop-blur-sm sm:px-6"
              >
                <dt className="text-xs font-semibold tracking-[0.1em] text-[#4a88b9]">
                  {item.label}
                </dt>
                <dd
                  className={`${styles.batang} mt-2 text-[1.45rem] text-[#1a1a2e]`}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:px-8 lg:px-14 lg:py-20">
        <div
          className={`${styles.cormorant} mx-auto max-w-6xl border-t border-[#ece9da] pt-7 text-xs tracking-[0.18em] text-[#aab0bd]`}
        >
          © 2026 LUCENT MANAGEMENT · {footerName}
        </div>
      </section>
    </main>
  );
}
