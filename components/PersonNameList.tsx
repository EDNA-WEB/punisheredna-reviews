import Link from 'next/link';

export default function PersonNameList({ names, slugByName }: { names: string[]; slugByName: Map<string, string> }) {
  return (
    <>
      {names.map((name, i) => (
        <span key={name + i}>
          {slugByName.has(name) ? (
            <Link href={`/osobnost/${slugByName.get(name)}`} className="hover:text-accent hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          {i < names.length - 1 && ', '}
        </span>
      ))}
    </>
  );
}
