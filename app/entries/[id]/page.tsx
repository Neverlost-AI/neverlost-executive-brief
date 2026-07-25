import { ExecutiveBriefApp } from "@/components/ExecutiveBriefApp";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExecutiveBriefApp view="detail" entryId={id} />;
}
