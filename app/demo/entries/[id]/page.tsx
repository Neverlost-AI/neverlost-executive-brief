import { DemoApp } from "@/components/DemoApp";

export default async function DemoEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DemoApp view="detail" entryId={id} />;
}
