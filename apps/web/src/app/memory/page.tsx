import { redirect } from "next/navigation";

type LegacyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function MemoryPage({ searchParams }: LegacyPageProps) {
  const params = await searchParams;
  redirect(`/chat/memory${buildQueryString(params)}`);
}
