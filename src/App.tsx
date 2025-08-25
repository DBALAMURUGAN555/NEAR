import React, { useState } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser
} from "@clerk/clerk-react";
import { Toaster } from "sonner";
import {
  HomeIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CubeTransparentIcon
} from "@heroicons/react/24/outline";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import TransactionBuilder from "./components/TransactionBuilder";
import SystemMonitor from "./components/SystemMonitor";
import { ComplianceCenter } from "./components/ComplianceCenter";
import { AdminPanel } from "./components/AdminPanel";
import { userHasAnyRole } from "./lib/rbac";
import RiskCenter from "./components/RiskCenter";
import SecurityCenter from "./components/SecurityCenter";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing Publishable Key");
}

export type Page =
  | "dashboard"
  | "transaction"
  | "compliance"
  | "monitor"
  | "reports"
  | "admin"
  | "settings"
  | "security";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const navigation = [
    { id: "dashboard" as Page, name: "Dashboard", icon: HomeIcon },
    {
      id: "transaction" as Page,
      name: "New Transaction",
      icon: PlusCircleIcon
    },
    { id: "compliance" as Page, name: "Compliance", icon: ShieldCheckIcon },
    {
      id: "monitor" as Page,
      name: "System Monitor",
      icon: CubeTransparentIcon
    },
    { id: "reports" as Page, name: "Risk Center", icon: DocumentTextIcon },
    { id: "security" as Page, name: "Security Center", icon: ShieldCheckIcon },
    { id: "admin" as Page, name: "Administration", icon: Cog6ToothIcon }
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "transaction":
        return <TransactionBuilder />;
      case "compliance":
        return <ComplianceCenter />;
      case "monitor":
        return <SystemMonitor />;
      case "admin":
        return <AdminRoute />;
      case "reports":
        return <RiskCenter />;
      case "security":
        return <SecurityCenter />;
      case "settings":
        return (
          <div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center'>
            <div className='text-center'>
              <Cog6ToothIcon className='h-16 w-16 text-gray-400 mx-auto mb-4' />
              <h2 className='text-2xl font-semibold text-gray-900 mb-2'>
                System Settings
              </h2>
              <p className='text-gray-600'>
                System configuration and user management coming soon.
              </p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'>
        <SignedOut>
          <header className='border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='flex justify-between items-center py-6'>
                <div className='flex items-center'>
                  <CubeTransparentIcon className='h-8 w-8 text-blue-600 mr-3' />
                  <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                    Institutional Custody
                  </h1>
                </div>
                <div>
                  <SignInButton mode='modal'>
                    <button className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors'>
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              </div>
            </div>
          </header>
          <main>
            <LandingPage />
          </main>
        </SignedOut>

        <SignedIn>
          <div className='flex'>
            {/* Sidebar Navigation */}
            <div className='w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-30'>
              <div className='p-6'>
                <div className='flex items-center'>
                  <CubeTransparentIcon className='h-8 w-8 text-blue-600 mr-3' />
                  <h1 className='text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
                    Custody Platform
                  </h1>
                </div>
                {/* OrganizationSwitcher commented out - organizations feature disabled in Clerk */}
                {/* <div className="mt-4">
                  <OrganizationSwitcher hidePersonal profileMode="navigation" />
                </div> */}
              </div>

              <nav className='mt-8 px-4'>
                <SidebarNav
                  navigation={navigation}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                />
              </nav>

              <div className='absolute bottom-4 left-4 right-4'>
                <div className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                  <UserButton afterSignOutUrl='/' />
                  <div className='text-sm text-gray-500'>Secure Session</div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className='flex-1 ml-64'>{renderPage()}</div>
          </div>
        </SignedIn>

        <Toaster
          position='top-right'
          expand={true}
          richColors
          closeButton
        />
      </div>
    </ClerkProvider>
  );
}

export default App;

function AdminRoute() {
  const { user } = useUser();
  const allowed = userHasAnyRole(user || null, ["admin", "ops"]);
  if (!allowed) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-2xl font-semibold text-gray-900 mb-2'>
            Access restricted
          </p>
          <p className='text-gray-600'>
            You need admin or ops privileges to view this page.
          </p>
        </div>
      </div>
    );
  }
  return <AdminPanel />;
}

function SidebarNav({
  navigation,
  currentPage,
  setCurrentPage
}: {
  navigation: Array<{
    id: Page;
    name: string;
    icon: (props: React.ComponentProps<"svg">) => JSX.Element;
  }>;
  currentPage: Page;
  setCurrentPage: (p: Page) => void;
}) {
  const { user } = useUser();
  return (
    <div className='space-y-2'>
      {navigation.map((item) => {
        const Icon = item.icon;
        if (item.id === "admin") {
          const canSeeAdmin = userHasAnyRole(user || null, ["admin", "ops"]);
          if (!canSeeAdmin) return null;
        }
        if (item.id === "security") {
          const canSeeSecurity = userHasAnyRole(user || null, [
            "admin",
            "ops",
            "security"
          ]);
          if (!canSeeSecurity) return null;
        }
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              currentPage === item.id
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}>
            <Icon className='h-5 w-5 mr-3' />
            {item.name}
          </button>
        );
      })}
    </div>
  );
}
