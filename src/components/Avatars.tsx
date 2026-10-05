import { avatarUri } from "@/lib/avatar";

export function Avatars({ people, total }: { people: { name: string }[]; total: number }) {
  return (
    <div className="avatars" aria-label={`${total} going`}>
      {people.map((p) => (
        <img key={p.name} src={avatarUri(p.name)} alt="" title={p.name} />
      ))}
      <span className="count" data-testid="going-count">
        {total} going
      </span>
    </div>
  );
}
