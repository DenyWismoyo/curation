├── functions
│ └── src
│ ├── agents
│ │ ├── affiliate
│ │ │ ├── affiliateAgent.ts
│ │ │ ├── attributionAgent.ts
│ │ │ └── commissionAgent.ts
│ │ ├── analytics
│ │ │ └── analyticsAgent.ts
│ │ ├── assessment
│ │ │ ├── adaptiveAssessmentAgent.ts
│ │ │ ├── copilotAgent.ts
│ │ │ ├── domainExpertsAgent.ts
│ │ │ ├── gatewayAgent.ts
│ │ │ ├── mockDataAgent.ts
│ │ │ ├── postProcessingAgent.ts
│ │ │ ├── premiumConsultationAgent.ts
│ │ │ ├── synthesisAgent.ts
│ │ │ ├── tacticalPlannerAgent.ts
│ │ │ └── triangulatorAgent.ts
│ │ ├── b2b
│ │ │ ├── b2bAnalyticsService.ts
│ │ │ ├── interactionAgent.ts
│ │ │ └── organizationAgent.ts
│ │ ├── crypto
│ │ │ ├── utils
│ │ │ │ └── indicators.ts
│ │ │ ├── cryptoAdminAgents.ts
│ │ │ ├── cryptoCopilotAgent.ts
│ │ │ ├── cryptoCronAgent.ts
│ │ │ ├── cryptoHiddenGemAgent.ts
│ │ │ ├── cryptoNewsAgent.ts
│ │ │ ├── cryptoOrchestrator.ts
│ │ │ └── cryptoPremiumIntelligenceAgent.ts
│ │ ├── formBuilder
│ │ │ ├── architectAgent.ts
│ │ │ ├── fabricatorAgent.ts
│ │ │ ├── ragSeederAgent.ts
│ │ │ └── validatorAgent.ts
│ │ ├── onboarding
│ │ │ └── adaptiveOnboardingAgent.ts
│ │ ├── promo
│ │ │ ├── articleAgent.ts
│ │ │ ├── articleImageAgent.ts
│ │ │ ├── copywriterAgent.ts
│ │ │ ├── identityAgent.ts
│ │ │ ├── imageRendererAgent.ts
│ │ │ ├── pricingAgent.ts
│ │ │ └── templateIdentityInspirationAgent.ts
│ │ ├── storyboard
│ │ │ └── videoPromptAgent.ts
│ │ ├── study
│ │ │ ├── architectAgent.ts
│ │ │ ├── chapterGenerationService.ts
│ │ │ ├── chapterRevisionAgent.ts
│ │ │ ├── citationAuditorAgent.ts
│ │ │ ├── consistencyAuditorAgent.ts
│ │ │ ├── exportService.ts
│ │ │ ├── plannerAgent.ts
│ │ │ ├── shared.ts
│ │ │ ├── sourceIngestionService.ts
│ │ │ ├── studyProjectAgent.ts
│ │ │ └── writerAgent.ts
│ │ └── telegram
│ │ └── telegramBot.ts
│ ├── email
│ │ ├── emailService.ts
│ │ └── nudgeService.ts
│ ├── general
│ │ ├── adaptiveValidationService.ts
│ │ ├── cacheCleanupService.ts
│ │ ├── cacheService.ts
│ │ ├── documentGenerator.ts
│ │ ├── evidenceService.ts
│ │ ├── microSimulatorService.ts
│ │ ├── omniAiService.ts
│ │ ├── paymentService.ts
│ │ ├── vectorService.ts
│ │ └── voiceService.ts
│ ├── pipelines
│ │ ├── assessment
│ │ │ └── orchestrator.ts
│ │ ├── formBuilder
│ │ │ └── orchestrator.ts
│ │ └── study
│ │ ├── chapterOrchestrator.ts
│ │ └── orchestrator.ts
│ ├── prompt
│ │ ├── aiConfigPrompt.ts
│ │ ├── formBuilderPrompt.ts
│ │ └── promptTemplate.ts
│ ├── scripts
│ │ └── normalizeUsers.ts
│ ├── templates
│ │ └── UniversalPDFDocument.tsx
│ ├── triggers
│ │ └── userClaimsSync.ts
│ ├── utils
│ │ └── retry.ts
│ ├── actionPlanService.ts
│ ├── fieldEnhancerService.ts
│ ├── index.ts
│ ├── outputService.ts
│ ├── pdfGenerator.ts
│ └── promptEnhancerService.ts
├── public
│ ├── .pengembangan
│ │ ├── implementation_plan_crypto-1.md
│ │ └── Penyempurnaan_promt_crypto.md
│ ├── docs
│ │ ├── crypto
│ │ │ ├── audit-keamanan.md
│ │ │ ├── cron-jobs-architecture.md
│ │ │ ├── edukasi-pasar-kripto.md
│ │ │ ├── keunggulan-platform.md
│ │ │ ├── panduan_operasional_founder.md
│ │ │ ├── penawaran-dan-pricing.md
│ │ │ ├── README.md
│ │ │ ├── regulasi_dan_kepatuhan.md
│ │ │ ├── rencana_alternative_pengembangan.md
│ │ │ ├── rencana_keuangan.md
│ │ │ ├── rencana_pemasaran.md
│ │ │ └── rencana-pengembangan.md
│ │ ├── apa_itu_omnifit.md
│ │ ├── assessor.md
│ │ ├── audit_affiliate_functions.md
│ │ ├── b2b-ketentuan-benefit.md
│ │ ├── crypto_deep_analysis.md
│ │ ├── crypto_final_audit_and_pricing.md
│ │ ├── curator.md
│ │ ├── dashboard.md
│ │ ├── estimasi-biaya-pembuatan-aplikasi-omnifit.md
│ │ ├── kak-implementasi-omnifit.md
│ │ ├── katalog.md
│ │ ├── landing.md
│ │ ├── mitra.md
│ │ ├── perbandingan-gemini-deepseek-agent.md
│ │ ├── pitch-script-omnifit-assessment-b2c-b2b.md
│ │ ├── pitchdeck-omnifit-assessment-b2c-b2b.md
│ │ ├── program-affiliate-omnifit.md
│ │ ├── proyeksi-harga-template-assessment.md
│ │ ├── redefinisi-omnifit-assessment.md
│ │ ├── study-pipeline-architecture.md
│ │ ├── tor-inisiatif-omnifit.md
│ │ └── value-ekonomi-sosial-dan-valuasi-omnifit.md
│ ├── fonts
│ │ ├── Inter-Black.ttf
│ │ ├── Inter-Bold.ttf
│ │ ├── Inter-ExtraBold.ttf
│ │ ├── Inter-ExtraLight.ttf
│ │ ├── Inter-Italic.ttf
│ │ ├── Inter-Light.ttf
│ │ ├── Inter-Medium.ttf
│ │ ├── Inter-Regular.ttf
│ │ ├── Inter-SemiBold.ttf
│ │ └── Inter-Thin.ttf
│ ├── AI_Blueprint_Blueprint_Akselerasi_Pertumbuh.pdf
│ ├── file.svg
│ ├── globe.svg
│ ├── icon-192x192.png
│ ├── icon-512x512.png
│ ├── logo.png
│ ├── next.svg
│ ├── robots.txt
│ ├── sitemap.xml
│ ├── vercel.svg
│ └── window.svg
└── src
├── app
│ ├── (auth)
│ │ ├── action
│ │ │ └── page.tsx
│ │ ├── login
│ │ │ └── page.tsx
│ │ └── verify-email
│ │ └── page.tsx
│ ├── (crypto)
│ │ ├── crypto
│ │ │ └── page.tsx
│ │ ├── crypto-report
│ │ │ ├── [symbol]
│ │ │ │ └── page.tsx
│ │ │ ├── danger-zone
│ │ │ │ └── page.tsx
│ │ │ ├── hidden-gems
│ │ │ │ └── page.tsx
│ │ │ ├── liquidity
│ │ │ │ └── page.tsx
│ │ │ ├── news
│ │ │ │ └── page.tsx
│ │ │ ├── performance
│ │ │ │ └── page.tsx
│ │ │ ├── realtime-radar
│ │ │ │ └── page.tsx
│ │ │ ├── scalping-radar
│ │ │ │ └── page.tsx
│ │ │ ├── smart-money
│ │ │ │ └── page.tsx
│ │ │ └── page.tsx
│ │ └── layout.tsx
│ ├── (landing)
│ │ ├── layout.tsx
│ │ └── page.tsx
│ ├── (public)
│ │ ├── affiliate
│ │ │ ├── program
│ │ │ │ └── page.tsx
│ │ │ └── page.tsx
│ │ ├── assessment
│ │ │ ├── [trackId]
│ │ │ │ └── page.tsx
│ │ │ ├── select
│ │ │ │ └── page.tsx
│ │ │ └── page.tsx
│ │ ├── checkout
│ │ │ └── [id]
│ │ │ └── page.tsx
│ │ ├── dashboard
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── explore
│ │ │ ├── [id]
│ │ │ │ └── page.tsx
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── fitur
│ │ │ └── page.tsx
│ │ ├── katalog
│ │ │ ├── layout.tsx
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── kebijakan
│ │ │ └── page.tsx
│ │ ├── komunitas
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── mitra
│ │ │ └── page.tsx
│ │ ├── onboarding
│ │ │ └── page.tsx
│ │ ├── privasi
│ │ │ └── page.tsx
│ │ ├── profil
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── progress
│ │ │ ├── loading.tsx
│ │ │ └── page.tsx
│ │ ├── result
│ │ │ └── [id]
│ │ │ ├── consultation
│ │ │ │ └── page.tsx
│ │ │ └── page.tsx
│ │ ├── riwayat
│ │ │ └── page.tsx
│ │ ├── roadmap
│ │ │ └── page.tsx
│ │ ├── token
│ │ │ └── page.tsx
│ │ ├── workspace
│ │ │ └── page.tsx
│ │ ├── error.tsx
│ │ ├── layout.tsx
│ │ └── loading.tsx
│ ├── (storyboard)
│ │ ├── storyboard
│ │ │ └── page.tsx
│ │ └── layout.tsx
│ ├── admin
│ │ ├── affiliate-program
│ │ │ └── page.tsx
│ │ ├── articles
│ │ │ └── page.tsx
│ │ ├── assessment
│ │ │ └── [id]
│ │ │ └── page.tsx
│ │ ├── assessors
│ │ │ └── page.tsx
│ │ ├── b2b-access
│ │ │ └── page.tsx
│ │ ├── b2b-analytics
│ │ │ └── page.tsx
│ │ ├── b2b-pilot
│ │ │ └── page.tsx
│ │ ├── b2b-tokens
│ │ │ └── page.tsx
│ │ ├── feedback
│ │ │ └── page.tsx
│ │ ├── onboarding-metrics
│ │ │ └── page.tsx
│ │ ├── partners
│ │ │ └── page.tsx
│ │ ├── pricing
│ │ │ └── page.tsx
│ │ ├── referrals
│ │ │ └── page.tsx
│ │ ├── roadmap
│ │ │ └── page.tsx
│ │ ├── templates
│ │ │ └── page.tsx
│ │ ├── tokens
│ │ │ └── page.tsx
│ │ ├── layout.tsx
│ │ └── page.tsx
│ ├── api
│ │ ├── crypto
│ │ │ ├── danger-zone
│ │ │ │ └── route.ts
│ │ │ ├── hidden-gems
│ │ │ │ └── route.ts
│ │ │ ├── news
│ │ │ │ └── route.ts
│ │ │ ├── reports
│ │ │ │ └── route.ts
│ │ │ └── smart-money
│ │ │ └── route.ts
│ │ ├── macro-calendar
│ │ │ └── route.ts
│ │ ├── migrate-b2b
│ │ │ └── route.ts
│ │ └── test-admin
│ │ └── route.ts
│ ├── assessor
│ │ ├── layout.tsx
│ │ └── page.tsx
│ ├── b2b
│ │ ├── executive
│ │ │ └── page.tsx
│ │ ├── hr
│ │ │ └── page.tsx
│ │ ├── leader
│ │ │ └── page.tsx
│ │ ├── login
│ │ │ └── page.tsx
│ │ ├── layout.tsx
│ │ └── page.tsx
│ ├── components
│ │ ├── admin
│ │ │ ├── b2b-pilot
│ │ │ │ ├── B2BPilotExportPackButton.tsx
│ │ │ │ └── B2BPilotPackPDFDocument.tsx
│ │ │ ├── template-builder
│ │ │ │ ├── TabAdaptive.tsx
│ │ │ │ ├── TabAIConfig.tsx
│ │ │ │ ├── TabFormBuilder.tsx
│ │ │ │ ├── TabGeneral.tsx
│ │ │ │ └── TabLogs.tsx
│ │ │ ├── AdminAssessmentDetail.tsx
│ │ │ ├── AdminExportPDF.tsx
│ │ │ ├── AdminTemplatePreview.tsx
│ │ │ ├── AdminTokenExportPDF.tsx
│ │ │ └── TemplateExportPDFButton.tsx
│ │ ├── assessor
│ │ │ ├── AssessorAssessmentDetail.tsx
│ │ │ ├── AssessorManualEditor.tsx
│ │ │ ├── AssessorTemplateBuilder.tsx
│ │ │ └── AssessorTemplatePreview.tsx
│ │ ├── b2b
│ │ │ ├── B2BBrandingEditor.tsx
│ │ │ ├── B2BInteractionModule.tsx
│ │ │ ├── B2BParticipantProfile.tsx
│ │ │ └── TenantSelfServiceDashboard.tsx
│ │ ├── curation
│ │ │ ├── ActionPlanBuilder.tsx
│ │ │ ├── ActionPlanCopilot.tsx
│ │ │ ├── AdminAutoFill.tsx
│ │ │ ├── CurationDashboard.tsx
│ │ │ ├── CurationLanding.tsx
│ │ │ ├── DraftValidationModal.tsx
│ │ │ ├── DynamicField.tsx
│ │ │ ├── DynamicTrackSelector.tsx
│ │ │ ├── DynamicWizard.tsx
│ │ │ ├── MicroSimulator.tsx
│ │ │ ├── PersonalActionPlanCopilot.tsx
│ │ │ ├── PremiumConsultationWorkspace.tsx
│ │ │ ├── PublicExportPDF.tsx
│ │ │ ├── ReviewAndConfirm.tsx
│ │ │ ├── SystemCapabilitiesModal.tsx
│ │ │ └── VoiceInputRecorder.tsx
│ │ ├── curator
│ │ │ ├── CuratorAssessmentDetail.tsx
│ │ │ └── PDFReportTemplate.tsx
│ │ ├── payment
│ │ │ ├── BundleUpsellBanner.tsx
│ │ │ └── PricingPackages.tsx
│ │ └── shared
│ │ ├── AdaptiveAssessmentView.tsx
│ │ ├── AIPromptBlueprintPDF.tsx
│ │ ├── BottomNav.tsx
│ │ ├── FeedbackModal.tsx
│ │ ├── GlobalFeedbackWidget.tsx
│ │ ├── GlobalFloatingWidget.tsx
│ │ ├── NotificationBell.tsx
│ │ ├── OmniAiWidget.tsx
│ │ ├── PWAInstallPrompt.tsx
│ │ ├── ReferralAttributionTracker.tsx
│ │ ├── SocialShareCard.tsx
│ │ ├── TemplateQuestionsPDF.tsx
│ │ ├── TokenBatchPDFDocument.tsx
│ │ ├── TokenExportPDFButton.tsx
│ │ ├── UniversalAssessmentView.tsx
│ │ └── UniversalPDFDocument.tsx
│ ├── curator
│ │ ├── assessment
│ │ │ └── [id]
│ │ │ └── page.tsx
│ │ ├── dashboard
│ │ │ └── page.tsx
│ │ ├── layout.tsx
│ │ └── page.tsx
│ ├── firebase-messaging-sw.js
│ │ └── route.ts
│ ├── legal
│ │ ├── crypto-risk
│ │ │ └── page.tsx
│ │ ├── privacy
│ │ │ └── page.tsx
│ │ └── tos
│ │ └── page.tsx
│ ├── mitra
│ │ └── [slug]
│ │ └── page.tsx
│ ├── study
│ │ ├── [projectId]
│ │ │ └── page.tsx
│ │ └── page.tsx
│ ├── favicon.ico
│ ├── globals.css
│ ├── layout.tsx
│ ├── manifest.ts
│ ├── opengraph-image.tsx
│ └── twitter-image.tsx
├── components
│ ├── crypto
│ │ ├── CryptoAlertsWidget.tsx
│ │ ├── CryptoCalendar.tsx
│ │ ├── CryptoCandlestick.tsx
│ │ ├── CryptoChat.tsx
│ │ ├── CryptoGuard.tsx
│ │ ├── CryptoLiveTicker.tsx
│ │ ├── CryptoNavbar.tsx
│ │ ├── CryptoSparkline.tsx
│ │ ├── MacroEconomicCalendar.tsx
│ │ ├── MarketHeatmapWidget.tsx
│ │ ├── MarketPulseWidget.tsx
│ │ ├── PremiumLockedScreen.tsx
│ │ ├── PremiumLockedWrapper.tsx
│ │ ├── TemporalComparisonWidget.tsx
│ │ └── WeeklyMonthlyOutlookWidget.tsx
│ ├── domain
│ │ └── public
│ │ ├── AssessmentStatusBadge.tsx
│ │ ├── BackLink.tsx
│ │ ├── ContentCard.tsx
│ │ ├── EmptyState.tsx
│ │ ├── GlassCardLayout.tsx
│ │ ├── index.ts
│ │ ├── MarkdownContent.tsx
│ │ ├── PageHeader.tsx
│ │ ├── PageHero.tsx
│ │ ├── PageLoading.tsx
│ │ ├── PageShell.tsx
│ │ ├── PublicFooter.tsx
│ │ ├── ScoreLineChart.tsx
│ │ └── StatCard.tsx
│ ├── icon
│ │ ├── AbstractHexaIcon.tsx
│ │ ├── AdminShieldIcon.tsx
│ │ ├── AILensIcon.tsx
│ │ ├── AiSparkIcon.tsx
│ │ ├── AppModuleIcons.tsx
│ │ ├── BadgeIcons.tsx
│ │ ├── BioCrescentIcon.tsx
│ │ ├── BrainIcon.tsx
│ │ ├── DigitalSwanIcon.tsx
│ │ ├── DividerIcons.tsx
│ │ ├── DocExportIcon.tsx
│ │ ├── EcoBirdIcon.tsx
│ │ ├── EcosystemIcon.tsx
│ │ ├── FlowingWavesIcon.tsx
│ │ ├── GlobalTargetIcon.tsx
│ │ ├── HexagonIcons.tsx
│ │ ├── index.ts
│ │ ├── InfinityWorkflowIcon.tsx
│ │ ├── SoaringLeafIcon.tsx
│ │ ├── TechCardIcon.tsx
│ │ ├── TenantHierarchyIcon.tsx
│ │ └── WaveSplashIcon.tsx
│ ├── shared
│ │ ├── CryptoDisclaimer.tsx
│ │ ├── index.ts
│ │ ├── PublicNavbar.tsx
│ │ ├── PublicSearchDialog.tsx
│ │ └── SafeLogo.tsx
│ ├── storyboard
│ │ └── SceneCard.tsx
│ └── ui
│ ├── accordion.tsx
│ ├── alert-dialog.tsx
│ ├── avatar.tsx
│ ├── badge.tsx
│ ├── button.tsx
│ ├── card.tsx
│ ├── command.tsx
│ ├── dialog.tsx
│ ├── dropdown-menu.tsx
│ ├── icons.tsx
│ ├── input.tsx
│ ├── label.tsx
│ ├── navigation-menu.tsx
│ ├── progress.tsx
│ ├── radio-group.tsx
│ ├── scroll-area.tsx
│ ├── select.tsx
│ ├── sheet.tsx
│ ├── skeleton.tsx
│ ├── sonner.tsx
│ ├── table.tsx
│ ├── tabs.tsx
│ ├── textarea.tsx
│ └── tooltip.tsx
├── contexts
│ ├── AuthContext.tsx
│ └── UserActivityContext.tsx
├── data
│ ├── aiPromptTemplates.tsx
│ ├── defaultTemplates.tsx
│ ├── documentPromptTemplates.ts
│ ├── domainPresets.ts
│ └── templateform.tsx
├── hooks
│ ├── useCuration.ts
│ ├── useFCMToken.ts
│ ├── useMobileBack.ts
│ ├── usePDFExport.ts
│ └── useTenantScope.ts
├── lib
│ ├── storyboard
│ │ └── storyboard.service.ts
│ ├── assessmentOutputMode.ts
│ ├── b2b-curator-audit.ts
│ ├── b2b-dashboard.ts
│ ├── firebase-admin.ts
│ ├── firebase.ts
│ ├── rate-limit.ts
│ ├── referralAttribution.ts
│ ├── session-auth.ts
│ ├── share.ts
│ └── utils.ts
├── services
│ └── ai.service.ts
└── types
├── curation.ts
└── index.ts
