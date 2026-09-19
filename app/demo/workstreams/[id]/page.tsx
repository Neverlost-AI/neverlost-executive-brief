import { DemoApp } from "@/components/DemoApp";

export default async function DemoWorkstreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DemoApp view="workstream-detail" workstreamId={id} />;
}
