"use client";

import React from "react";
import { CryptoPremiumGate } from "../ui/CryptoUIKit";
import { useAuth } from "@/contexts/AuthContext";

interface PremiumLockedWrapperProps {
  children: React.ReactNode;
  hasAccess: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function PremiumLockedWrapper({ 
  children, 
  hasAccess, 
  title = "Fitur Premium", 
  description = "Upgrade ke Premium untuk membuka fitur ini.",
  className = ""
}: PremiumLockedWrapperProps) {
  const { cryptoTrialUsed } = useAuth();
  
  return (
    <div className={className}>
      <CryptoPremiumGate 
        hasAccess={hasAccess} 
        mode="overlay" 
        title={title} 
        description={description}
        isTrialAvailable={!cryptoTrialUsed}
      >
        {children}
      </CryptoPremiumGate>
    </div>
  );
}
