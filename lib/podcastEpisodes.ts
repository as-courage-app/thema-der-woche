export type PodcastEpisode = {
  themeNumber: number;
  title: string;
  description?: string;
  audioSrc: string;
};

export const podcastEpisodes: PodcastEpisode[] = Array.from({ length: 41 }, (_, i) => {
  const n = i + 1;
  const nn = String(n).padStart(2, '0');
  return {
    themeNumber: n,
    title: `Thema ${n} – Podcast`,
    description: `Podcastfolge zu Thema ${n}.`,
    audioSrc: `/podcast/thema-${nn}.mp3`,
  };
});