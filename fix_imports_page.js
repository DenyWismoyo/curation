const fs = require('fs');

const filePath = 'd:/DENY/project/curation/src/app/(crypto)/crypto-report/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/import CryptoChat from "[^"]+";/g, 'import CryptoChat from "@/features/crypto/components/chat/CryptoChat";');
content = content.replace(/import CryptoCandlestick from "[^"]+";/g, 'import CryptoCandlestick from "@/features/crypto/components/charts/CryptoCandlestick";');
content = content.replace(/import CryptoLiveTicker from "[^"]+";/g, 'import CryptoLiveTicker from "@/features/crypto/components/shared/CryptoLiveTicker";');
content = content.replace(/import CryptoAlertsWidget from "[^"]+";/g, 'import CryptoAlertsWidget from "@/features/crypto/components/alerts/CryptoAlertsWidget";');
content = content.replace(/import CryptoCalendar from "[^"]+";/g, 'import CryptoCalendar from "@/features/crypto/components/dashboard/CryptoCalendar";');
content = content.replace(/import MacroEconomicCalendar from "[^"]+";/g, 'import MacroEconomicCalendar from "@/features/crypto/components/dashboard/MacroEconomicCalendar";');
content = content.replace(/import MarketPulseWidget from "[^"]+";/g, 'import MarketPulseWidget from "@/features/crypto/components/dashboard/MarketPulseWidget";');
content = content.replace(/import MarketHeatmapWidget from "[^"]+";/g, 'import MarketHeatmapWidget from "@/features/crypto/components/dashboard/MarketHeatmapWidget";');
content = content.replace(/import TemporalComparisonWidget from "[^"]+";/g, 'import TemporalComparisonWidget from "@/features/crypto/components/dashboard/TemporalComparisonWidget";');
content = content.replace(/import WeeklyMonthlyOutlookWidget from "[^"]+";/g, 'import WeeklyMonthlyOutlookWidget from "@/features/crypto/components/dashboard/WeeklyMonthlyOutlookWidget";');
content = content.replace(/import { PremiumLockedWrapper } from "[^"]+";/g, 'import { PremiumLockedWrapper } from "@/features/crypto/components/alerts/PremiumLockedWrapper";');
content = content.replace(/import CryptoDisclaimer from "[^"]+";/g, 'import CryptoDisclaimer from "@/features/crypto/components/shared/CryptoDisclaimer";');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed imports in page.tsx');
