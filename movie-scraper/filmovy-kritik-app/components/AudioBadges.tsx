import { IconSubtitles, IconDubbing, IconOriginalOnly } from './Icons';

export default function AudioBadges({
  hasSubtitles,
  hasDubbing,
  size = 'w-3.5 h-3.5'
}: {
  hasSubtitles: boolean;
  hasDubbing: boolean;
  size?: string;
}) {
  if (!hasSubtitles && !hasDubbing) {
    return (
      <span
        title="Iba v originálnom znení, bez SK/CZ titulkov a dabingu"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface border border-line text-muted"
      >
        <IconOriginalOnly className={size} />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {hasDubbing && (
        <span
          title="Dostupný dabing"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600"
        >
          <IconDubbing className={size} />
        </span>
      )}
      {hasSubtitles && (
        <span
          title="Dostupné titulky"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-50 border border-sky-300 text-sky-600"
        >
          <IconSubtitles className={size} />
        </span>
      )}
    </span>
  );
}
