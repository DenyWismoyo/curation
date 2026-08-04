import { ReactNode } from "react";

export const metadata = {
  title: "AI Video Storyboard",
  description: "Generator prompt video AI berkesinambungan",
};

export default function StoryboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
