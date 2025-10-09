import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import BeforeUnloadWarning from "@/components/BeforeUnloadWarning"; // <--- import here

export const metadata = {
  title: "Digisailor",
  description: "Your App Description",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BeforeUnloadWarning /> {/* <--- add here */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
