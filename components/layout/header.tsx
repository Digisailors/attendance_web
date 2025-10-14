"use client";

import { useState } from "react";


interface HeaderProps {
  title: string;
  subtitle?: string;
  userType: "admin" | "employee" | "team-lead" | "manager";
  userId?: string;
}

export function Header({ title, subtitle, userType, userId }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  const getUserName = () => {
    switch (userType) {
      case "admin":
        return "Admin User";
      case "employee":
        return "John Doe";
      case "team-lead":
        return "Team Lead";
      case "manager":
        return "Manager";
      default:
        return "User";
    }
  };

  const getNotificationCount = () => {
    switch (userType) {
      case "team-lead":
        return 2;
      case "manager":
        return 1;
      default:
        return 0;
    }
  };

   return (
     <header className="bg-white border-b border-gray-200 px-6 py-4">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
           {subtitle && (
             <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
           )}
         </div>

         
       </div>
     </header>
   );
}
