import { ManagerLayout } from '@/components/manager/layout';

export default function ManagerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerLayout>{children}</ManagerLayout>;
}
