'use client';

import React from 'react';
import { CryptoPremiumGate } from '../ui/CryptoUIKit';
import { useAuth } from '@/contexts/AuthContext';

interface PremiumLockedScreenProps {
  title?: string;
  description?: string;
}

export function PremiumLockedScreen({ 
  title = "Akses Fitur Premium", 
  description = "Halaman ini berisi analitik AI tingkat lanjut yang khusus tersedia untuk pelanggan Premium." 
}: PremiumLockedScreenProps) {
  const { cryptoTrialUsed } = useAuth();

  return (
    <CryptoPremiumGate 
      hasAccess={false} 
      mode="fullscreen" 
      title={title} 
      description={description}
      isTrialAvailable={!cryptoTrialUsed}
    >
      {null}
    </CryptoPremiumGate>
  );
}
