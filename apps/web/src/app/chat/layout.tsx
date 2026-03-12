import { Suspense } from "react";
import type { ReactNode } from "react";
import { WorkspaceShell } from "../../components/workspace-shell";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Suspense>
  );
}
