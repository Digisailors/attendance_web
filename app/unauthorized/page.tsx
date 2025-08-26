"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function Unauthorized() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back(); // last page ku pogum
    } else {
      router.push("/"); // fallback → home page ku pogum
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl text-red-600 font-bold">Access Denied</h1>
        <p className="text-gray-600">
          You are not authorized to view this page.
        </p>

        {/* Back Arrow Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 mx-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      </div>
    </div>
  );
}