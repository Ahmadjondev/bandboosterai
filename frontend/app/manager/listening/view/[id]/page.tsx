import ListeningForm from '@/components/manager/listening/ListeningForm';

export default async function ViewListeningPage({ params }: { params: any }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="px-4 py-6 lg:px-8">
        <ListeningForm mode="view" id={id} />
      </div>
    </div>
  );
}
