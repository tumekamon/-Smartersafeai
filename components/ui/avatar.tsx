function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  person,
  size = 28,
}: {
  person: { id: string; firstName: string; lastName: string };
  size?: number;
}) {
  const hue = hueFor(person.id);
  return (
    <span
      title={`${person.firstName} ${person.lastName}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 58% 46%), hsl(${(hue + 32) % 360} 60% 38%))`,
      }}
    >
      {person.firstName[0]}
      {person.lastName[0]}
    </span>
  );
}
