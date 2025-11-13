import MockTestForm from '@/components/manager/mock-tests/MockTestForm';

export default function CreateMockTestPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MockTestForm mode="create" />
    </div>
  );
}
