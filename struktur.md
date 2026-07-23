├── functions
│   └── src
│       ├── agents
│       │   ├── assessment
│       │   │   ├── domainExpertsAgent.ts
│       │   │   ├── gatewayAgent.ts
│       │   │   ├── postProcessingAgent.ts
│       │   │   ├── tacticalPlannerAgent.ts
│       │   │   └── triangulatorAgent.ts
│       │   └── formBuilder
│       │       ├── architectAgent.ts
│       │       ├── fabricatorAgent.ts
│       │       ├── ragSeederAgent.ts
│       │       └── validatorAgent.ts
│       ├── promt
│       │   ├── aiConfigPrompt.ts
│       │   ├── formBuilderPrompt.ts
│       │   └── promptTemplate.ts
│       ├── templates
│       │   └── UniversalPDFDocument.tsx
│       ├── actionPlanService.ts
│       ├── adaptiveValidationService.ts
│       ├── documentGenerator.ts
│       ├── emailService.ts
│       ├── fieldEnhancerService.ts
│       ├── formBuilderService.ts
│       ├── index.ts
│       ├── nudgeService.ts
│       ├── omniAiService.ts
│       ├── outputService.ts
│       ├── paymentService.ts
│       ├── pdfGenerator.ts
│       ├── promptEnhancerService.ts
│       └── vectorService.ts
├── public
│   ├── docs
│   │   ├── apa_itu_omnifit.md
│   │   ├── architecture-review.md
│   │   ├── assessor.md
│   │   ├── curator.md
│   │   ├── dashboard.md
│   │   ├── katalog.md
│   │   ├── landing.md
│   │   └── mitra.md
│   ├── fonts
│   │   ├── Inter-Black.ttf
│   │   ├── Inter-Bold.ttf
│   │   ├── Inter-ExtraBold.ttf
│   │   ├── Inter-ExtraLight.ttf
│   │   ├── Inter-Italic.ttf
│   │   ├── Inter-Light.ttf
│   │   ├── Inter-Medium.ttf
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   └── Inter-Thin.ttf
│   ├── file.svg
│   ├── globe.svg
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── logo.png
│   ├── next.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── vercel.svg
│   └── window.svg
└── src
    ├── app
    │   ├── (public)
    │   │   ├── assessment
    │   │   │   ├── [trackId]
    │   │   │   │   └── page.tsx
    │   │   │   └── page.tsx
    │   │   ├── dashboard
    │   │   │   └── page.tsx
    │   │   ├── katalog
    │   │   │   └── page.tsx
    │   │   ├── mitra
    │   │   │   └── page.tsx
    │   │   ├── result
    │   │   │   └── [id]
    │   │   │       └── page.tsx
    │   │   ├── token
    │   │   │   └── page.tsx
    │   │   ├── workspace
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── admin
    │   │   ├── assessment
    │   │   │   └── [id]
    │   │   │       └── page.tsx
    │   │   ├── assessors
    │   │   │   └── page.tsx
    │   │   ├── feedback
    │   │   │   └── page.tsx
    │   │   ├── partners
    │   │   │   └── page.tsx
    │   │   ├── pricing
    │   │   │   └── page.tsx
    │   │   ├── templates
    │   │   │   └── page.tsx
    │   │   ├── tokens
    │   │   │   └── page.tsx
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── assessor
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components
    │   │   ├── admin
    │   │   │   ├── template-builder
    │   │   │   │   ├── TabAIConfig.tsx
    │   │   │   │   ├── TabFormBuilder.tsx
    │   │   │   │   ├── TabGeneral.tsx
    │   │   │   │   └── TabLogs.tsx
    │   │   │   ├── AdminAssessmentDetail.tsx
    │   │   │   ├── AdminExportPDF.tsx
    │   │   │   ├── AdminTemplatePreview.tsx
    │   │   │   ├── AdminTokenExportPDF.tsx
    │   │   │   └── TemplateExportPDFButton.tsx
    │   │   ├── assessor
    │   │   │   ├── AssessorAssessmentDetail.tsx
    │   │   │   ├── AssessorManualEditor.tsx
    │   │   │   ├── AssessorTemplateBuilder.tsx
    │   │   │   └── AssessorTemplatePreview.tsx
    │   │   ├── curation
    │   │   │   ├── ActionPlanBuilder.tsx
    │   │   │   ├── CurationDashboard.tsx
    │   │   │   ├── CurationLanding.tsx
    │   │   │   ├── DynamicField.tsx
    │   │   │   ├── DynamicTrackSelector.tsx
    │   │   │   ├── DynamicWizard.tsx
    │   │   │   ├── PublicExportPDF.tsx
    │   │   │   ├── ReviewAndConfirm.tsx
    │   │   │   └── SystemCapabilitiesModal.tsx
    │   │   ├── curator
    │   │   │   ├── CuratorAssessmentDetail.tsx
    │   │   │   └── PDFReportTemplate.tsx
    │   │   ├── payment
    │   │   │   └── PricingPackages.tsx
    │   │   └── shared
    │   │       ├── AIPromptBlueprintPDF.tsx
    │   │       ├── FeedbackModal.tsx
    │   │       ├── GlobalFeedbackWidget.tsx
    │   │       ├── GlobalFloatingWidget.tsx
    │   │       ├── OmniAiWidget.tsx
    │   │       ├── PWAInstallPrompt.tsx
    │   │       ├── SocialShareCard.tsx
    │   │       ├── TemplateQuestionsPDF.tsx
    │   │       ├── TokenBatchPDFDocument.tsx
    │   │       ├── TokenExportPDFButton.tsx
    │   │       ├── UniversalAssessmentView.tsx
    │   │       └── UniversalPDFDocument.tsx
    │   ├── curator
    │   │   ├── assessment
    │   │   │   └── [id]
    │   │   │       └── page.tsx
    │   │   ├── dashboard
    │   │   │   └── page.tsx
    │   │   └── page.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── manifest.ts
    ├── components
    │   ├── icon
    │   │   ├── AbstractHexaIcon.tsx
    │   │   ├── AdminShieldIcon.tsx
    │   │   ├── AILensIcon.tsx
    │   │   ├── AiSparkIcon.tsx
    │   │   ├── AppModuleIcons.tsx
    │   │   ├── BadgeIcons.tsx
    │   │   ├── BioCrescentIcon.tsx
    │   │   ├── BrainIcon.tsx
    │   │   ├── DigitalSwanIcon.tsx
    │   │   ├── DividerIcons.tsx
    │   │   ├── DocExportIcon.tsx
    │   │   ├── EcoBirdIcon.tsx
    │   │   ├── EcosystemIcon.tsx
    │   │   ├── FlowingWavesIcon.tsx
    │   │   ├── GlobalTargetIcon.tsx
    │   │   ├── HexagonIcons.tsx
    │   │   ├── InfinityWorkflowIcon.tsx
    │   │   ├── SoaringLeafIcon.tsx
    │   │   ├── TechCardIcon.tsx
    │   │   ├── TenantHierarchyIcon.tsx
    │   │   └── WaveSplashIcon.tsx
    │   └── ui
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── progress.tsx
    │       ├── radio-group.tsx
    │       ├── scroll-area.tsx
    │       ├── sonner.tsx
    │       └── textarea.tsx
    ├── contexts
    │   └── AuthContext.tsx
    ├── data
    │   ├── aiPromptTemplates.tsx
    │   ├── defaultTemplates.tsx
    │   ├── documentPromptTemplates.ts
    │   ├── domainPresets.ts
    │   └── templateform.tsx
    ├── hooks
    │   ├── useCuration.ts
    │   ├── useMobileBack.ts
    │   └── usePDFExport.ts
    ├── lib
    │   ├── firebase-admin.ts
    │   ├── firebase.ts
    │   └── utils.ts
    ├── services
    │   └── ai.service.ts
    └── types
        ├── curation.ts
        └── index.ts